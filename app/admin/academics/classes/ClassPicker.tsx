"use client";

import { Combobox, Group, Input, InputBase, SimpleGrid, Text, useCombobox } from "@mantine/core";
import { useState } from "react";
import { AppLink } from "@/components/AppLink";
import { Field } from "@/components/Field";

// What the office weighs up when choosing a class: who teaches it, how full it is and who
// is already waiting for it.
export type ClassChoice = {
  id: number;
  name: string;
  sessionId: number;
  sessionName: string;
  classTeacherName: string | null;
  studentCount: number;
  capacity: number | null;
  applicationCount: number;
};

export const isFull = (c: ClassChoice) => c.capacity !== null && c.studentCount >= c.capacity;

export function places(c: ClassChoice) {
  return c.capacity === null ? `${c.studentCount} placed` : `${c.studentCount} of ${c.capacity}`;
}

type PickerProps = {
  label: string;
  options: ClassChoice[];
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
  description?: string;
};

// The class drop-down shared by "offer a place" and "move": a button showing the choice,
// the search box inside the list (so a chosen class never sits in the way of typing), and
// each option carrying the teacher, places and waiting list.
export function ClassPicker({ label, options, value, onChange, error, description }: PickerProps) {
  const [search, setSearch] = useState("");
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch("");
    },
    onDropdownOpen: () => combobox.focusSearchInput(),
  });
  const chosen = options.find((c) => String(c.id) === value) ?? null;
  const q = search.trim().toLowerCase();
  const shown = options.filter(
    (c) => !q || `${c.name} ${c.sessionName} ${c.classTeacherName ?? ""}`.toLowerCase().includes(q),
  );
  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(v) => {
        onChange(v);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          label={label}
          description={description}
          withAsterisk
          pointer
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          onClick={() => combobox.toggleDropdown()}
          error={error}
          aria-haspopup="listbox"
        >
          {chosen ? (
            `${chosen.name} · ${chosen.sessionName}`
          ) : (
            <Input.Placeholder>Choose a class</Input.Placeholder>
          )}
        </InputBase>
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Search
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          placeholder="Search by class, session or teacher"
        />
        <Combobox.Options mah={280} style={{ overflowY: "auto" }}>
          {shown.length === 0 ? (
            <Combobox.Empty>No class matches</Combobox.Empty>
          ) : (
            shown.map((c) => (
              <Combobox.Option key={c.id} value={String(c.id)}>
                <Group justify="space-between" wrap="nowrap">
                  <div>
                    <Text size="sm">
                      {c.name} · {c.sessionName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {c.classTeacherName ?? "No class teacher"} · {places(c)}
                      {c.applicationCount > 0 &&
                        ` · ${c.applicationCount} ${c.applicationCount === 1 ? "application" : "applications"} waiting`}
                    </Text>
                  </div>
                  {isFull(c) && (
                    <Text size="xs" c="saffron" fw={500}>
                      Full
                    </Text>
                  )}
                </Group>
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

// The facts about one class in a grid, with the way to its page.
export function ClassSummary({ cls, extra }: { cls: ClassChoice; extra?: React.ReactNode }) {
  return (
    <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="md">
      <Field
        label="Class"
        value={
          <AppLink href={`/admin/academics/classes/${cls.id}`}>
            {cls.name} · {cls.sessionName}
          </AppLink>
        }
      />
      <Field label="Class teacher" value={cls.classTeacherName ?? "None yet"} />
      <Field label="Places" value={places(cls)} />
      <Field
        label="Applications"
        value={cls.applicationCount ? String(cls.applicationCount) : "None"}
      />
      {extra}
    </SimpleGrid>
  );
}
