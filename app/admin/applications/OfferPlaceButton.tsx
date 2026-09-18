"use client";

import { Button } from "@mantine/core";
import { useState } from "react";
import type { ClassChoice } from "@/app/admin/academics/classes/ClassPicker";
import type { Application } from "@/lib/db/queries/applications";
import type { FamilyMember } from "@/lib/db/queries/families";
import { OfferPlaceModal } from "./OfferPlaceModal";

type Props = {
  application: Application;
  classes: ClassChoice[];
  family: FamilyMember[];
  standardFeeCents: number;
  today: string;
  size?: "xs" | "sm";
  variant?: "filled" | "light";
};

// "Offer a place" from a class's Applications tab or a student's page: the same modal as
// the inbox.
export function OfferPlaceButton({ size = "sm", variant = "filled", ...props }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size={size} variant={variant} onClick={() => setOpen(true)}>
        Offer a place
      </Button>
      <OfferPlaceModal
        {...props}
        application={open ? props.application : null}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
