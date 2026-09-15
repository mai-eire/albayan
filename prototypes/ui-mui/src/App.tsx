import { useState, type ReactNode } from "react";
import {
  AppBar, Avatar, Badge, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  Drawer, FormControl, IconButton, InputLabel, List, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Select,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Toolbar, Tooltip,
  Typography, useMediaQuery, useTheme,
} from "@mui/material";
import { Timeline, TimelineConnector, TimelineContent, TimelineDot, TimelineItem, TimelineOppositeContent, TimelineSeparator } from "@mui/lab";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { type Dayjs } from "dayjs";
import {
  Add, CalendarMonth, Check, ExpandMore, FactCheck, Folder, Groups, MenuBook, Menu as MenuIcon, Notifications,
  ReportProblemOutlined, School, StickyNote2, UploadFile, WbSunny,
} from "@mui/icons-material";
import {
  classOptions, gregorian, hijri, homeworkDue, lessons, nowIndex, stats, students, subjectColor, subjectOptions,
  teacher, type Status,
} from "./data";

const NAV_WIDTH = 240;
const nav = [
  { label: "Today", icon: <WbSunny />, active: true },
  { label: "My classes", icon: <Groups /> },
  { label: "Attendance", icon: <FactCheck /> },
  { label: "Homework", icon: <MenuBook /> },
  { label: "Resources", icon: <Folder /> },
  { label: "Calendar", icon: <CalendarMonth /> },
];

// Map the shared subject colour names onto palette keys.
const paletteKey = (c: string) => (c === "tile" ? "primary" : c === "muted" ? "default" : c) as "primary" | "lapis" | "plum" | "default";

export default function App() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [navOpen, setNavOpen] = useState(false);
  const [homeworkOpen, setHomeworkOpen] = useState(false);

  const navContent = (
    <List sx={{ px: 1, pt: 1 }}>
      {nav.map((n) => (
        <ListItemButton key={n.label} selected={n.active} sx={{ borderRadius: 2, mb: 0.5, "&.Mui-selected": { bgcolor: "primary.light", color: "primary.dark" } }}>
          <ListItemIcon sx={{ minWidth: 36, color: n.active ? "primary.dark" : "text.secondary" }}>{n.icon}</ListItemIcon>
          <ListItemText primary={n.label} slotProps={{ primary: { sx: { fontWeight: 600, fontSize: 14 } } }} />
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="fixed" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: "divider", zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 1.5 }}>
          {!isDesktop && <IconButton edge="start" onClick={() => setNavOpen(true)} aria-label="Open menu"><MenuIcon /></IconButton>}
          <Avatar variant="rounded" sx={{ bgcolor: "primary.main", width: 36, height: 36 }}><School fontSize="small" /></Avatar>
          <Typography variant="h4" sx={{ flexGrow: 1 }}>Al-Bayan</Typography>
          <RoleSwitcher />
          <IconButton aria-label="Notifications">
            <Badge color="saffron" variant="dot"><Notifications /></Badge>
          </IconButton>
          <Avatar sx={{ bgcolor: "primary.light", color: "primary.dark", fontWeight: 700, fontSize: 14 }}>{teacher.initials}</Avatar>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isDesktop ? "permanent" : "temporary"}
        open={isDesktop || navOpen}
        onClose={() => setNavOpen(false)}
        sx={{ width: NAV_WIDTH, flexShrink: 0, "& .MuiDrawer-paper": { width: NAV_WIDTH, boxSizing: "border-box", borderRight: 1, borderColor: "divider" } }}
      >
        <Toolbar />
        {navContent}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, maxWidth: 1180, mx: "auto", width: "100%" }}>
        <Toolbar />
        <Stack spacing={3}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{gregorian} · {hijri}</Typography>
              <Typography variant="h1">Good morning, {teacher.name.split(" ")[0]}</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" startIcon={<FactCheck />}>Take register</Button>
              <Button variant="outlined" startIcon={<Add />} onClick={() => setHomeworkOpen(true)}>Add homework</Button>
            </Stack>
          </Stack>

          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" } }}>
            {stats.map((s) => (
              <Card key={s.label}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{s.label}</Typography>
                  <Typography variant="h2">{s.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{s.hint}</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" } }}>
            <Stack spacing={2}>
              <LessonsCard />
              <RegisterCard />
            </Stack>
            <Stack spacing={2}>
              <HomeworkDueCard />
              <QuickActionsCard onAddHomework={() => setHomeworkOpen(true)} />
            </Stack>
          </Box>
        </Stack>
      </Box>

      <AddHomeworkDialog open={homeworkOpen} onClose={() => setHomeworkOpen(false)} />
    </Box>
  );
}

function RoleSwitcher() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Button size="small" variant="outlined" color="inherit" endIcon={<ExpandMore />} onClick={(e) => setAnchor(e.currentTarget)} sx={{ borderColor: "divider" }}>
        Teacher
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {teacher.roles.map((r) => (
          <MenuItem key={r} onClick={() => setAnchor(null)} selected={r === "Teacher"}>
            {r === "Teacher" && <ListItemIcon><Check fontSize="small" /></ListItemIcon>}
            {r}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

function LessonsCard() {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h3">Today's lessons</Typography>
          <Chip size="small" label="Saturday session" variant="outlined" />
        </Stack>
        <Timeline sx={{ p: 0, m: 0, "& .MuiTimelineOppositeContent-root": { flex: 0.18, pl: 0 } }}>
          {lessons.map((l, i) => {
            const isBreak = l.subject === "Break";
            const isNow = i === nowIndex;
            return (
              <TimelineItem key={i}>
                <TimelineOppositeContent sx={{ fontVariantNumeric: "tabular-nums", color: "text.secondary", fontSize: 13, pt: 1.2 }}>
                  {l.start}
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot sx={{ bgcolor: isNow ? "saffron.main" : i < nowIndex ? "primary.main" : "divider", boxShadow: "none" }}>
                    {isNow && <WbSunny sx={{ fontSize: 12 }} />}
                  </TimelineDot>
                  {i < lessons.length - 1 && <TimelineConnector sx={{ bgcolor: i < nowIndex ? "primary.main" : "divider" }} />}
                </TimelineSeparator>
                <TimelineContent sx={{ pb: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Typography sx={{ fontWeight: 600 }} color={isBreak ? "text.secondary" : "text.primary"}>{l.subject}</Typography>
                    {!isBreak && <Chip size="small" label={l.className} color={paletteKey(subjectColor[l.subject])} variant="outlined" />}
                    {isNow && <Chip size="small" label="Now" color="saffron" />}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">{l.start}–{l.end}{l.room && ` · ${l.room}`}</Typography>
                  {l.registerDue && <Button size="small" startIcon={<FactCheck />} sx={{ mt: 0.5, ml: -1 }}>Register not taken</Button>}
                </TimelineContent>
              </TimelineItem>
            );
          })}
        </Timeline>
      </CardContent>
    </Card>
  );
}

function RegisterCard() {
  const [rows, setRows] = useState(students);
  const set = (id: number, status: Status | null) => status && setRows((r) => r.map((s) => (s.id === id ? { ...s, status } : s)));
  const count = (st: Status) => rows.filter((s) => s.status === st).length;
  const statusColor = (st: Status) => (st === "present" ? "primary" : st === "late" ? "saffron" : "clay");

  return (
    <Card>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 1, mb: 2 }}>
          <Box>
            <Typography variant="h3">Register · Level 2</Typography>
            <Typography variant="body2" color="text.secondary">Saturday 19 September · 8 students</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Chip size="small" label={`${count("present")} present`} sx={{ bgcolor: "primary.light", color: "primary.dark" }} />
            <Chip size="small" label={`${count("late")} late`} sx={{ bgcolor: "saffron.light", color: "saffron.dark" }} />
            <Chip size="small" label={`${count("absent")} absent`} sx={{ bgcolor: "clay.light", color: "clay.dark" }} />
          </Stack>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Age</TableCell>
              <TableCell align="right">Attendance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell sx={{ py: 1 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: s.status === "absent" ? "grey.300" : "primary.light", color: s.status === "absent" ? "grey.700" : "primary.dark", fontWeight: 700 }}>
                      {s.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </Avatar>
                    <Typography sx={{ fontWeight: 500 }}>{s.name}</Typography>
                    {s.allergy && (
                      <Tooltip title={s.allergy}><ReportProblemOutlined sx={{ fontSize: 16, color: "clay.main" }} /></Tooltip>
                    )}
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{s.age}</TableCell>
                <TableCell align="right">
                  <ToggleButtonGroup exclusive size="small" value={s.status} onChange={(_, v) => set(s.id, v)} color={statusColor(s.status)}>
                    <ToggleButton value="present">Present</ToggleButton>
                    <ToggleButton value="late">Late</ToggleButton>
                    <ToggleButton value="absent">Absent</ToggleButton>
                  </ToggleButtonGroup>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
          <Button variant="outlined" color="inherit" sx={{ borderColor: "divider" }}>Save draft</Button>
          <Button variant="contained" startIcon={<Check />}>Submit register</Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function HomeworkDueCard() {
  return (
    <Card>
      <CardContent>
        <Typography variant="h3" sx={{ mb: 2 }}>Homework due today</Typography>
        <Stack spacing={1}>
          {homeworkDue.map((h, i) => (
            <Box key={i} sx={{ p: 1.5, borderRadius: 2, bgcolor: "background.default", cursor: "pointer" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                <Chip size="small" label={h.subject} color={paletteKey(subjectColor[h.subject])} />
                <Typography variant="caption" color="text.secondary">{h.className}</Typography>
              </Stack>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{h.title}</Typography>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

function QuickActionsCard({ onAddHomework }: { onAddHomework: () => void }) {
  const actions: { label: string; icon: ReactNode; color: string; onClick?: () => void }[] = [
    { label: "Take register", icon: <FactCheck />, color: "primary" },
    { label: "Add homework", icon: <MenuBook />, color: "lapis", onClick: onAddHomework },
    { label: "Add a note", icon: <StickyNote2 />, color: "plum" },
    { label: "Share a resource", icon: <UploadFile />, color: "saffron" },
  ];
  return (
    <Card>
      <CardContent>
        <Typography variant="h3" sx={{ mb: 2 }}>Quick actions</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
          {actions.map((a) => (
            <Button key={a.label} onClick={a.onClick} variant="outlined" color="inherit" sx={{ flexDirection: "column", gap: 1, py: 2, borderColor: "divider", borderRadius: 3 }}>
              <Avatar variant="rounded" sx={{ bgcolor: `${a.color}.light`, color: `${a.color}.dark` }}>{a.icon}</Avatar>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{a.label}</Typography>
            </Button>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

function AddHomeworkDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [due, setDue] = useState<Dayjs | null>(dayjs("2026-09-26"));
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle component="div"><Typography variant="h3">Add homework</Typography></DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Class</InputLabel>
              <Select label="Class" defaultValue={classOptions[0]}>{classOptions.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}</Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Subject</InputLabel>
              <Select label="Subject" defaultValue="Quran">{subjectOptions.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}</Select>
            </FormControl>
          </Stack>
          <TextField label="Title" placeholder="e.g. Memorise Surah Al-Fil, verses 1–5" size="small" fullWidth />
          <TextField label="Details" placeholder="What should students do, and how will you check it?" multiline minRows={3} fullWidth />
          <DatePicker label="Due date" value={due} onChange={setDue} format="ddd D MMM YYYY" slotProps={{ textField: { size: "small" } }} />
          <Typography variant="caption" color="text.secondary">Parents and students of Level 2 will be notified when you publish.</Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button variant="contained" onClick={onClose}>Publish homework</Button>
      </DialogActions>
    </Dialog>
  );
}
