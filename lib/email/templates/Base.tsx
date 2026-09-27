import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

// Email clients ignore our theme, so the brand colours are repeated here on purpose.
const colors = {
  tile: "#146c60",
  ink: "#14282c",
  ground: "#f4f8f6",
  dimmed: "#6b7a7d",
  line: "#dfe6e3",
};
const font = "Figtree, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

type Props = {
  schoolName: string;
  // Absolute URL of the school's logo, when they have one.
  logo?: string | null;
  preview: string;
  heading: string;
  children: ReactNode;
};

export function Base({ schoolName, logo, preview, heading, children }: Props) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{ backgroundColor: colors.ground, fontFamily: font, color: colors.ink, margin: 0 }}
      >
        <Container style={{ maxWidth: 560, margin: "32px auto", padding: "0 16px" }}>
          {logo && (
            <Img
              src={logo}
              alt=""
              height={40}
              style={{ display: "block", height: 40, width: "auto", margin: "0 0 8px" }}
            />
          )}
          <Text style={{ fontSize: 14, fontWeight: 700, color: colors.tile, margin: "0 0 16px" }}>
            {schoolName}
          </Text>
          <Section
            style={{
              backgroundColor: "#ffffff",
              border: `1px solid ${colors.line}`,
              borderRadius: 16,
              padding: 24,
            }}
          >
            <Heading
              as="h1"
              style={{
                fontSize: 22,
                fontWeight: 800,
                margin: "0 0 16px",
                letterSpacing: "-0.01em",
              }}
            >
              {heading}
            </Heading>
            {children}
          </Section>
          <Hr style={{ borderColor: colors.line, margin: "24px 0 12px" }} />
          <Text style={{ fontSize: 12, color: colors.dimmed, margin: 0 }}>
            Sent by {schoolName}. If you weren&apos;t expecting this email you can ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function Paragraph({ children }: { children: ReactNode }) {
  return <Text style={{ fontSize: 16, lineHeight: "24px", margin: "0 0 16px" }}>{children}</Text>;
}

export function ActionButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: colors.tile,
        color: "#ffffff",
        fontSize: 16,
        fontWeight: 600,
        borderRadius: 8,
        padding: "12px 20px",
        display: "inline-block",
      }}
    >
      {children}
    </Button>
  );
}

// Shown under a button so the link still works where buttons don't.
export function FallbackLink({ href }: { href: string }) {
  return (
    <Text
      style={{ fontSize: 12, color: colors.dimmed, margin: "16px 0 0", wordBreak: "break-all" }}
    >
      Or copy this link:{" "}
      <Link href={href} style={{ color: colors.tile }}>
        {href}
      </Link>
    </Text>
  );
}
