import { useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle, Bell, BookOpen, CalendarDays, Check, ChevronDown, ClipboardCheck, Clock, Folder, Menu, Plus,
  School, StickyNote, Sun, Upload, Users,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  classOptions, gregorian, hijri, homeworkDue, lessons, nowIndex, stats, students, subjectColor, subjectOptions,
  teacher, type Status,
} from "./data";

const nav = [
  { label: "Today", icon: Sun, active: true },
  { label: "My classes", icon: Users },
  { label: "Attendance", icon: ClipboardCheck },
  { label: "Homework", icon: BookOpen },
  { label: "Resources", icon: Folder },
  { label: "Calendar", icon: CalendarDays },
];

const subjectBadge = (c: string) => (c === "tile" ? "tile" : c === "lapis" ? "lapis" : c === "plum" ? "plum" : "muted") as "tile" | "lapis" | "plum" | "muted";
const subjectSolid = (c: string) => `${subjectBadge(c)}-solid` as "tile-solid" | "lapis-solid" | "plum-solid";

export default function App() {
  const [navOpen, setNavOpen] = useState(false);
  const [homeworkOpen, setHomeworkOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-card px-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setNavOpen((o) => !o)} aria-label="Menu"><Menu /></Button>
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><School className="size-5" /></div>
        <span className="font-display text-lg font-extrabold">Al-Bayan</span>
        <div className="ms-auto flex items-center gap-2">
          <RoleSwitcher />
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="size-5" />
            <span className="absolute end-2 top-2 size-2 rounded-full bg-saffron-500" />
          </Button>
          <Avatar><AvatarFallback>{teacher.initials}</AvatarFallback></Avatar>
        </div>
      </header>

      <aside className={cn("fixed inset-y-0 start-0 z-30 w-60 border-e border-border bg-card pt-16 transition-transform md:translate-x-0", navOpen ? "translate-x-0" : "-translate-x-full")}>
        <nav className="flex flex-col gap-1 p-3">
          {nav.map(({ label, icon: Icon, active }) => (
            <a key={label} href="#" className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-accent hover:text-accent-foreground", active && "bg-secondary text-secondary-foreground")}>
              <Icon className="size-4" />{label}
            </a>
          ))}
        </nav>
      </aside>

      <main className="pt-16 md:ps-60">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6 p-4 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted">{gregorian} · {hijri}</p>
              <h1 className="text-3xl font-extrabold tracking-tight">Good morning, {teacher.name.split(" ")[0]}</h1>
            </div>
            <div className="flex gap-2">
              <Button><ClipboardCheck />Take register</Button>
              <Button variant="secondary" onClick={() => setHomeworkOpen(true)}><Plus />Add homework</Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {stats.map((s) => (
              <Card key={s.label}>
                <p className="text-sm font-medium text-muted">{s.label}</p>
                <p className="font-display text-4xl font-extrabold leading-tight">{s.value}</p>
                <p className="text-xs text-muted">{s.hint}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-4 md:col-span-2">
              <LessonsCard />
              <RegisterCard />
            </div>
            <div className="flex flex-col gap-4">
              <HomeworkDueCard />
              <QuickActionsCard onAddHomework={() => setHomeworkOpen(true)} />
            </div>
          </div>
        </div>
      </main>

      <AddHomeworkDialog open={homeworkOpen} onOpenChange={setHomeworkOpen} />
    </div>
  );
}

function RoleSwitcher() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">Teacher<ChevronDown /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Switch to</DropdownMenuLabel>
        {teacher.roles.map((r) => (
          <DropdownMenuItem key={r}>{r === "Teacher" ? <Check className="size-4" /> : <span className="size-4" />}{r}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LessonsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's lessons</CardTitle>
        <Badge variant="outline"><Clock className="size-3" />Saturday session</Badge>
      </CardHeader>
      <ol className="relative ms-3 border-s-2 border-line">
        {lessons.map((l, i) => {
          const isBreak = l.subject === "Break";
          const isNow = i === nowIndex;
          return (
            <li key={i} className="relative mb-5 ps-6 last:mb-0">
              <span className={cn("absolute -start-[9px] top-1 flex size-4 items-center justify-center rounded-full border-2 border-card", isNow ? "bg-saffron-500" : i < nowIndex ? "bg-primary" : "bg-line")}>
                {isNow && <Sun className="size-2.5 text-ink" />}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("font-semibold", isBreak && "text-muted")}>{l.subject}</span>
                {!isBreak && <Badge variant={subjectBadge(subjectColor[l.subject])}>{l.className}</Badge>}
                {isNow && <Badge variant="saffron-solid">Now</Badge>}
              </div>
              <p className="text-sm text-muted tabular-nums">{l.start}–{l.end}{l.room && ` · ${l.room}`}</p>
              {l.registerDue && <Button variant="ghost" size="sm" className="-ms-2 mt-1 text-tile-700"><ClipboardCheck />Register not taken</Button>}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function RegisterCard() {
  const [rows, setRows] = useState(students);
  const set = (id: number, status: string) => status && setRows((r) => r.map((s) => (s.id === id ? { ...s, status: status as Status } : s)));
  const count = (st: Status) => rows.filter((s) => s.status === st).length;
  const onColor: Record<Status, string> = { present: "var(--color-tile-700)", late: "var(--color-saffron-800)", absent: "var(--color-clay-700, #a33729)" };

  return (
    <Card>
      <CardHeader className="flex-wrap">
        <div>
          <CardTitle>Register · Level 2</CardTitle>
          <p className="text-sm text-muted">Saturday 19 September · 8 students</p>
        </div>
        <div className="flex gap-1.5">
          <Badge variant="tile">{count("present")} present</Badge>
          <Badge variant="saffron">{count("late")} late</Badge>
          <Badge variant="clay">{count("absent")} absent</Badge>
        </div>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Age</TableHead>
            <TableHead className="text-end">Attendance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="size-7"><AvatarFallback className={cn(s.status === "absent" && "bg-line text-muted")}>{s.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
                  <span className="font-medium">{s.name}</span>
                  {s.allergy && <span title={s.allergy} className="flex size-5 items-center justify-center rounded-full bg-clay-50 text-clay-600"><AlertCircle className="size-3" /></span>}
                </div>
              </TableCell>
              <TableCell className="tabular-nums">{s.age}</TableCell>
              <TableCell className="text-end">
                <ToggleGroup type="single" value={s.status} onValueChange={(v) => set(s.id, v)} style={{ "--on-color": onColor[s.status] } as React.CSSProperties}>
                  <ToggleGroupItem value="present">Present</ToggleGroupItem>
                  <ToggleGroupItem value="late">Late</ToggleGroupItem>
                  <ToggleGroupItem value="absent">Absent</ToggleGroupItem>
                </ToggleGroup>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="outline">Save draft</Button>
        <Button><Check />Submit register</Button>
      </div>
    </Card>
  );
}

function HomeworkDueCard() {
  return (
    <Card>
      <CardHeader><CardTitle>Homework due today</CardTitle></CardHeader>
      <ul className="flex flex-col gap-2">
        {homeworkDue.map((h, i) => (
          <li key={i} className="cursor-pointer rounded-xl bg-ground p-3 hover:bg-tile-50">
            <div className="mb-1 flex items-center gap-2">
              <Badge variant={subjectSolid(subjectColor[h.subject])}>{h.subject}</Badge>
              <span className="text-xs text-muted">{h.className}</span>
            </div>
            <p className="text-sm font-medium">{h.title}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function QuickActionsCard({ onAddHomework }: { onAddHomework: () => void }) {
  const actions = [
    { label: "Take register", icon: ClipboardCheck, cls: "bg-tile-50 text-tile-800" },
    { label: "Add homework", icon: BookOpen, cls: "bg-lapis-50 text-lapis-800", onClick: onAddHomework },
    { label: "Add a note", icon: StickyNote, cls: "bg-plum-50 text-plum-800" },
    { label: "Share a resource", icon: Upload, cls: "bg-saffron-50 text-saffron-800" },
  ];
  return (
    <Card>
      <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
      <div className="grid grid-cols-2 gap-2">
        {actions.map(({ label, icon: Icon, cls, onClick }) => (
          <button key={label} onClick={onClick} className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-sm font-semibold hover:bg-ground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className={cn("flex size-10 items-center justify-center rounded-lg", cls)}><Icon className="size-5" /></span>
            {label}
          </button>
        ))}
      </div>
    </Card>
  );
}

function AddHomeworkDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [due, setDue] = useState<Date | undefined>(new Date(2026, 8, 26));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Add homework</DialogTitle>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="hw-class">Class</Label>
              <Select defaultValue={classOptions[0]}>
                <SelectTrigger id="hw-class"><SelectValue /></SelectTrigger>
                <SelectContent>{classOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="hw-subject">Subject</Label>
              <Select defaultValue="Quran">
                <SelectTrigger id="hw-subject"><SelectValue /></SelectTrigger>
                <SelectContent>{subjectOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="hw-title">Title</Label>
            <Input id="hw-title" placeholder="e.g. Memorise Surah Al-Fil, verses 1–5" />
          </div>
          <div>
            <Label htmlFor="hw-details">Details</Label>
            <Textarea id="hw-details" placeholder="What should students do, and how will you check it?" />
          </div>
          <div>
            <Label htmlFor="hw-due">Due date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="hw-due" variant="outline" className="w-full justify-start font-normal"><CalendarDays />{due ? format(due, "EEE d MMM yyyy") : "Pick a date"}</Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={due} onSelect={setDue} defaultMonth={due} />
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-xs text-muted">Parents and students of Level 2 will be notified when you publish.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onOpenChange(false)}>Publish homework</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
