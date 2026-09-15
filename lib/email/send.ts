import { render } from "@react-email/components";
import type { ReactElement } from "react";
import { transportFromEnv, type Transport } from "./transport";

type Message = { to: string; subject: string; body: ReactElement };

// Renders a React Email template to HTML + plain text and hands it to the transport.
export async function sendEmail(message: Message, transport: Transport = transportFromEnv()) {
  const [html, text] = await Promise.all([
    render(message.body),
    render(message.body, { plainText: true }),
  ]);
  await transport.send({ to: message.to, subject: message.subject, html, text });
}
