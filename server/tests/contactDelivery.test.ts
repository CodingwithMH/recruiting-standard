import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production-min-32-chars";
process.env.EMAIL_FROM = "notifications@therecruitingstandard.com";
process.env.CONTACT_INBOX_EMAIL = "inbox@therecruitingstandard.com";

test("contact form delivers through SMTP and returns a confirmation response", async () => {
  let deliveredMessage = "";
  const deliveredRecipients: string[] = [];

  const smtpServer = net.createServer((socket) => {
    socket.setEncoding("utf8");
    socket.write("220 localhost ESMTP\r\n");

    let buffer = "";
    let dataMode = false;
    let authLoginStep = 0;

    socket.on("data", (chunk: string) => {
      buffer += chunk;

      while (true) {
        if (dataMode) {
          const end = buffer.indexOf("\r\n.\r\n");
          if (end === -1) return;

          deliveredMessage = buffer.slice(0, end);
          buffer = buffer.slice(end + 5);
          dataMode = false;
          socket.write("250 2.0.0 OK: queued\r\n");
          continue;
        }

        const lineEnd = buffer.indexOf("\r\n");
        if (lineEnd === -1) return;

        const line = buffer.slice(0, lineEnd);
        buffer = buffer.slice(lineEnd + 2);
        const upper = line.toUpperCase();

        if (authLoginStep === 1) {
          authLoginStep = 2;
          socket.write("334 UGFzc3dvcmQ6\r\n");
          continue;
        }

        if (authLoginStep === 2) {
          authLoginStep = 0;
          socket.write("235 2.7.0 Authentication successful\r\n");
          continue;
        }

        if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
          socket.write(
            "250-localhost\r\n250-AUTH PLAIN LOGIN\r\n250 SIZE 10485760\r\n"
          );
        } else if (upper.startsWith("AUTH LOGIN")) {
          authLoginStep = 1;
          socket.write("334 VXNlcm5hbWU6\r\n");
        } else if (upper.startsWith("AUTH PLAIN")) {
          socket.write("235 2.7.0 Authentication successful\r\n");
        } else if (upper.startsWith("MAIL FROM")) {
          socket.write("250 2.1.0 OK\r\n");
        } else if (upper.startsWith("RCPT TO")) {
          const match = line.match(/^RCPT TO:\s*<([^>]+)>/i);
          if (match) deliveredRecipients.push(match[1]);
          socket.write("250 2.1.5 OK\r\n");
        } else if (upper === "DATA") {
          dataMode = true;
          socket.write("354 End data with <CR><LF>.<CR><LF>\r\n");
        } else if (upper === "RSET" || upper === "NOOP") {
          socket.write("250 2.0.0 OK\r\n");
        } else if (upper === "QUIT") {
          socket.write("221 2.0.0 Bye\r\n");
          socket.end();
        } else {
          socket.write("250 2.0.0 OK\r\n");
        }
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    smtpServer.once("error", reject);
    smtpServer.listen(0, "127.0.0.1", () => resolve());
  });

  try {
    const smtpAddress = smtpServer.address();
    if (!smtpAddress || typeof smtpAddress === "string") {
      throw new Error("Unable to determine mock SMTP server address");
    }

    process.env.SMTP_HOST = "127.0.0.1";
    process.env.SMTP_PORT = String(smtpAddress.port);
    process.env.SMTP_USER = "test-user";
    process.env.SMTP_PASS = "test-pass";

    const { default: app } = await import("../src/app.js");

    const apiServer = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve, reject) => {
      apiServer.once("listening", () => resolve());
      apiServer.once("error", reject);
    });

    try {
      const apiAddress = apiServer.address();
      if (!apiAddress || typeof apiAddress === "string") {
        throw new Error("Unable to determine API server address");
      }

      const response = await fetch(
        `http://127.0.0.1:${apiAddress.port}/api/v1/contact`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "MVP 4.18 QA Test",
            email: "qa-test@therecruitingstandard.com",
            inquiryType: "DEMO",
            message:
              "Automated contact delivery test. Please disregard this message.",
          }),
        }
      );

      const body = (await response.json()) as {
        success: boolean;
        message?: string;
        data?: { recipient?: string; inquiryType?: string };
      };

      assert.equal(response.status, 201);
      assert.equal(body.success, true);
      assert.match(
        body.message ?? "",
        /We aim to respond within 1–2 business days/
      );
      assert.equal(body.data?.recipient, "inbox@therecruitingstandard.com");
      assert.equal(body.data?.inquiryType, "DEMO");

      assert.deepEqual(deliveredRecipients, ["inbox@therecruitingstandard.com"]);
      assert.match(deliveredMessage, /To: inbox@therecruitingstandard\.com/i);
      assert.match(
        deliveredMessage,
        /Subject: \[MVP 4\.18\] Demo request inquiry from MVP 4\.18 QA Test/i
      );
      assert.match(
        deliveredMessage,
        /Reply-To: qa-test@therecruitingstandard\.com/i
      );
      assert.match(deliveredMessage, /Automated contact delivery test/);
    } finally {
      await new Promise<void>((resolve) => apiServer.close(() => resolve()));
    }
  } finally {
    await new Promise<void>((resolve) => smtpServer.close(() => resolve()));
  }
});
