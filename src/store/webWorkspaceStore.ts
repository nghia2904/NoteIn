import { addDays, format } from 'date-fns';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

const memoryFallback = new Map<string, string>();

const browserLocalStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(name);
      }
    } catch {
      // Ignore
    }
    return memoryFallback.get(name) ?? null;
  },
  setItem: (name: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(name, value);
        return;
      }
    } catch {
      // Ignore
    }
    memoryFallback.set(name, value);
  },
  removeItem: (name: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(name);
        return;
      }
    } catch {
      // Ignore
    }
    memoryFallback.delete(name);
  },
};

export type TaskStatus = 'pending' | 'in_progress' | 'done';
export type TaskBadgeColor =
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'burgundy'
  | 'blue'
  | 'dark'
  | 'deadline';

export const TASK_IMPORTANCE_COLORS: {
  id: 'green' | 'yellow' | 'orange' | 'red' | 'burgundy';
  hex: string;
  weight: number;
}[] = [
  { id: 'green', hex: '#22c55e', weight: 1 },
  { id: 'yellow', hex: '#eab308', weight: 2 },
  { id: 'orange', hex: '#f97316', weight: 3 },
  { id: 'red', hex: '#ef4444', weight: 4 },
  { id: 'burgundy', hex: '#881337', weight: 5 },
];

export function getTaskColorHex(color: TaskBadgeColor): string {
  switch (color) {
    case 'burgundy':
      return '#881337'; // Đỏ đậm (Cao nhất - 5)
    case 'red':
    case 'deadline':
      return '#ef4444'; // Đỏ tươi (4)
    case 'orange':
    case 'dark':
      return '#f97316'; // Cam (3)
    case 'yellow':
      return '#eab308'; // Vàng (2)
    case 'green':
    case 'blue':
    default:
      return '#22c55e'; // Xanh lá (1)
  }
}

export function getTaskColorWeight(color: TaskBadgeColor): number {
  switch (color) {
    case 'burgundy':
      return 5;
    case 'red':
    case 'deadline':
      return 4;
    case 'orange':
    case 'dark':
      return 3;
    case 'yellow':
      return 2;
    case 'green':
    case 'blue':
    default:
      return 1;
  }
}

export interface WorkTask {
  id: string;
  title: string;
  subtitle: string;
  dueDate: string; // yyyy-MM-dd
  status: TaskStatus;
  badgeColor: TaskBadgeColor;
  isDeadline?: boolean;
}

export type TransactionType = 'expense' | 'income';

export interface FinanceCategory {
  id: string;
  nameVi: string;
  nameEn: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export const FINANCE_CATEGORIES: FinanceCategory[] = [
  { id: 'food', nameVi: 'Ăn uống', nameEn: 'Food & Drink', icon: '🍜', color: '#f97316', type: 'expense' },
  { id: 'transport', nameVi: 'Di chuyển', nameEn: 'Transport', icon: '🛵', color: '#3b82f6', type: 'expense' },
  { id: 'shopping', nameVi: 'Mua sắm', nameEn: 'Shopping', icon: '🛍️', color: '#ec4899', type: 'expense' },
  { id: 'bills', nameVi: 'Hóa đơn & Nhà', nameEn: 'Bills & Rent', icon: '⚡', color: '#8b5cf6', type: 'expense' },
  { id: 'study', nameVi: 'Học tập & Sách', nameEn: 'Education', icon: '📚', color: '#06b6d4', type: 'expense' },
  { id: 'entertainment', nameVi: 'Giải trí & Cafe', nameEn: 'Cafe & Fun', icon: '☕', color: '#eab308', type: 'expense' },
  { id: 'salary', nameVi: 'Lương chính', nameEn: 'Salary', icon: '💰', color: '#10b981', type: 'income' },
  { id: 'freelance', nameVi: 'Dự án / Freelance', nameEn: 'Freelance', icon: '💻', color: '#14b8a6', type: 'income' },
  { id: 'bonus', nameVi: 'Thưởng & Khác', nameEn: 'Bonus & Other', icon: '🎁', color: '#22c55e', type: 'income' },
];

export interface FinanceTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: string; // yyyy-MM-dd
  note: string;
}

export interface QuickNoteItem {
  id: string;
  title: string;
  content: string;
  folder: 'all' | 'work' | 'personal' | 'ideas';
  pinned: boolean;
  updatedAt: string; // ISO string
}

export interface MindmapNode {
  id: string;
  parentId: string | null;
  title: string;
  subtitle: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  nodes: MindmapNode[];
}

const now = new Date();
const todayStr = format(now, 'yyyy-MM-dd');
const dOffset = (days: number) => format(addDays(now, days), 'yyyy-MM-dd');

const INITIAL_TASKS: WorkTask[] = [
  {
    id: 'task-1',
    title: 'Hoàn thiện giao diện Web NoteIn',
    subtitle: 'React Native Web · Notion Style',
    dueDate: todayStr,
    status: 'in_progress',
    badgeColor: 'burgundy',
  },
  {
    id: 'task-2',
    title: 'Gửi báo cáo tiến độ Sprint tuần',
    subtitle: 'Team Product',
    dueDate: dOffset(-1),
    status: 'pending',
    badgeColor: 'deadline',
    isDeadline: true,
  },
  {
    id: 'task-3',
    title: 'Thanh toán hóa đơn Server & Cloud',
    subtitle: 'AWS / Vercel',
    dueDate: dOffset(-2),
    status: 'pending',
    badgeColor: 'deadline',
    isDeadline: true,
  },
  {
    id: 'task-4',
    title: 'Review thiết kế Mindmap Project',
    subtitle: 'UI/UX Design',
    dueDate: todayStr,
    status: 'pending',
    badgeColor: 'blue',
  },
  {
    id: 'task-5',
    title: 'Chuẩn bị slide thuyết trình khách hàng',
    subtitle: 'Q4 Roadmap',
    dueDate: dOffset(1),
    status: 'pending',
    badgeColor: 'burgundy',
  },
  {
    id: 'task-6',
    title: 'Kiểm thử Widget Màn hình khóa iOS & Android',
    subtitle: 'QA Mobile',
    dueDate: dOffset(2),
    status: 'in_progress',
    badgeColor: 'dark',
  },
  {
    id: 'task-7',
    title: 'Hạn đăng bài tổng kết dự án tháng',
    subtitle: 'Content & Marketing',
    dueDate: dOffset(3),
    status: 'pending',
    badgeColor: 'deadline',
    isDeadline: true,
  },
  {
    id: 'task-8',
    title: 'Tối ưu hiệu năng lưu trữ LocalStorage',
    subtitle: 'Zustand Persist',
    dueDate: dOffset(-3),
    status: 'done',
    badgeColor: 'blue',
  },
  {
    id: 'task-9',
    title: 'Thiết lập cấu hình EAS Build Android',
    subtitle: 'DevOps',
    dueDate: dOffset(-4),
    status: 'done',
    badgeColor: 'blue',
  },
  {
    id: 'task-10',
    title: 'Họp định hướng tính năng quý tới',
    subtitle: 'Core Team',
    dueDate: dOffset(5),
    status: 'pending',
    badgeColor: 'burgundy',
  },
];

const INITIAL_TRANSACTIONS: FinanceTransaction[] = [
  {
    id: 'tx-1',
    type: 'income',
    amount: 18500000,
    categoryId: 'salary',
    date: dOffset(-5),
    note: 'Lương tháng này',
  },
  {
    id: 'tx-2',
    type: 'income',
    amount: 4200000,
    categoryId: 'freelance',
    date: dOffset(-2),
    note: 'Thanh toán dự án Web App',
  },
  {
    id: 'tx-3',
    type: 'expense',
    amount: 85000,
    categoryId: 'food',
    date: todayStr,
    note: 'Ăn trưa & Cà phê làm việc',
  },
  {
    id: 'tx-4',
    type: 'expense',
    amount: 1250000,
    categoryId: 'bills',
    date: dOffset(-1),
    note: 'Tiền điện, Internet & iCloud',
  },
  {
    id: 'tx-5',
    type: 'expense',
    amount: 450000,
    categoryId: 'study',
    date: dOffset(-3),
    note: 'Mua sách kỹ thuật & khóa học',
  },
  {
    id: 'tx-6',
    type: 'expense',
    amount: 320000,
    categoryId: 'shopping',
    date: todayStr,
    note: 'Phụ kiện bàn làm việc',
  },
];

const INITIAL_NOTES: QuickNoteItem[] = [
  {
    id: 'note-1',
    title: '📌 Kế hoạch phát triển NoteIn Workspace',
    content:
      '• Hoàn thiện giao diện Web theo phong cách Notion & Google Calendar\n• Tích hợp sơ đồ tư duy (Mindmap) cho từng Project\n• Theo dõi thu chi cá nhân kiểu MoneyNote\n• Toàn bộ dữ liệu lưu an toàn trên trình duyệt cá nhân (LocalStorage)',
    folder: 'work',
    pinned: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'note-2',
    title: 'Ý tưởng nội dung & tính năng mới',
    content:
      '1. Chế độ Focus Pomodoro kết hợp âm thanh mưa rừng\n2. Xuất báo cáo thu chi cuối tháng ra CSV/Markdown\n3. Phím tắt gõ nhanh Quick Note ngay ở thanh bên trái',
    folder: 'ideas',
    pinned: true,
    updatedAt: addDays(new Date(), -1).toISOString(),
  },
  {
    id: 'note-3',
    title: 'Danh sách sách & tài liệu cần đọc tuần này',
    content:
      '- Designing Data-Intensive Applications (Chương 5 & 6)\n- Clean Architecture trong React & TypeScript\n- Ôn tập từ vựng tiếng Anh chuyên ngành mỗi sáng 06:00',
    folder: 'personal',
    pinned: false,
    updatedAt: addDays(new Date(), -2).toISOString(),
  },
];

const INITIAL_PROJECTS: ProjectItem[] = [
  {
    id: 'proj-1',
    title: 'Web / App NoteIn',
    description: 'Ứng dụng quản lý lịch, công việc, tài chính và ghi chú đa nền tảng',
    nodes: [
      {
        id: 'root-1',
        parentId: null,
        title: 'Web / App NoteIn',
        subtitle: 'Hệ sinh thái quản lý cá nhân trên iOS, Android và Web PC',
      },
      {
        id: 'n-101',
        parentId: 'root-1',
        title: 'Giao diện Web PC',
        subtitle: 'Notion & Google Calendar style',
      },
      {
        id: 'n-102',
        parentId: 'root-1',
        title: 'Mobile Lock Screen',
        subtitle: 'iOS Live Activity & Android RemoteViews',
      },
      {
        id: 'n-103',
        parentId: 'root-1',
        title: 'Quản lý Tài chính',
        subtitle: 'MoneyNote thu chi & thống kê',
      },
      {
        id: 'n-104',
        parentId: 'n-101',
        title: 'Tab Dashboard & Công việc',
        subtitle: 'Theo dõi việc hôm nay, quá hạn & lịch tháng',
      },
      {
        id: 'n-105',
        parentId: 'n-101',
        title: 'Project Mindmap',
        subtitle: 'Quỹ đạo dự án & cây tư duy đa nhánh',
      },
      {
        id: 'n-106',
        parentId: 'n-102',
        title: 'Chế độ Lịch Daily',
        subtitle: 'Thanh tiến độ % theo khung giờ thực',
      },
      {
        id: 'n-107',
        parentId: 'n-102',
        title: 'Chế độ Lịch Bàn',
        subtitle: 'Sự kiện trong ngày hiện tại',
      },
    ],
  },
  {
    id: 'proj-2',
    title: 'Threads - nhomusaigon',
    description: 'Đây là threads chính thức chia sẻ về cuộc sống, công nghệ và góc làm việc',
    nodes: [
      {
        id: 'root-2',
        parentId: null,
        title: 'Threads - nhomusaigon',
        subtitle: 'Đây là threads chính thức chia sẻ về cuộc sống cá nhân, khoảnh khắc & góc làm việc',
      },
      {
        id: 'n-201',
        parentId: 'root-2',
        title: 'Review đồ ăn / địa điểm',
        subtitle: 'Ảnh tiêu biểu / video ngắn',
      },
      {
        id: 'n-202',
        parentId: 'root-2',
        title: 'Chia sẻ kiến thức / mẹo / cách dùng',
        subtitle: 'Dựa trên kinh nghiệm làm việc, thích uống cà phê, decor bàn học',
      },
      {
        id: 'n-203',
        parentId: 'root-2',
        title: 'Khoảnh khắc trong cuộc sống',
        subtitle: 'Ảnh / video thường ngày',
      },
      {
        id: 'n-204',
        parentId: 'n-201',
        title: 'Quán cà phê yên tĩnh làm việc',
        subtitle: 'Quận 1 & Bình Thạnh',
      },
      {
        id: 'n-205',
        parentId: 'n-201',
        title: 'Góc bàn làm việc tối giản',
        subtitle: 'Setup màn hình & ánh sáng',
      },
      {
        id: 'n-206',
        parentId: 'n-202',
        title: 'Mẹo quản lý thời gian với NoteIn',
        subtitle: 'Lịch ngày & Mindmap',
      },
    ],
  },
  {
    id: 'proj-3',
    title: 'Vlog decor phòng và khu vực làm việc',
    description: 'Nâng cấp góc học tập, ánh sáng và thiết bị năng suất',
    nodes: [
      {
        id: 'root-3',
        parentId: null,
        title: 'Vlog decor phòng & góc làm việc',
        subtitle: 'Lên ý tưởng thiết kế, ánh sáng và phụ kiện bàn làm việc',
      },
      {
        id: 'n-301',
        parentId: 'root-3',
        title: 'Ánh sáng & Đèn bàn',
        subtitle: 'Screenbar & đèn hắt tường ấm',
      },
      {
        id: 'n-302',
        parentId: 'root-3',
        title: 'Phụ kiện công thái học',
        subtitle: 'Ghế, giá đỡ laptop & bàn phím cơ',
      },
    ],
  },
  {
    id: 'proj-4',
    title: 'Kế hoạch học tập & Chứng chỉ',
    description: 'Lộ trình nâng cao ngoại ngữ và kỹ năng hệ thống',
    nodes: [
      {
        id: 'root-4',
        parentId: null,
        title: 'Kế hoạch học tập & Chứng chỉ',
        subtitle: 'Mục tiêu hoàn thành trong quý này',
      },
      {
        id: 'n-401',
        parentId: 'root-4',
        title: 'Ngoại ngữ mỗi sáng',
        subtitle: '30 từ vựng + luyện nghe 45 phút',
      },
      {
        id: 'n-402',
        parentId: 'root-4',
        title: 'System Design & Cloud',
        subtitle: 'Thực hành kiến trúc & CI/CD',
      },
    ],
  },
  {
    id: 'proj-5',
    title: 'Dự án tiếp theo',
    description: 'Nơi ươm mầm các ý tưởng mới đang ấp ủ',
    nodes: [
      {
        id: 'root-5',
        parentId: null,
        title: 'Dự án tiếp theo',
        subtitle: 'Bấm dấu + để phát triển thêm các nhánh ý tưởng mới',
      },
    ],
  },
];

interface WebWorkspaceState {
  tasks: WorkTask[];
  transactions: FinanceTransaction[];
  notes: QuickNoteItem[];
  projects: ProjectItem[];
  addTask: (task: Omit<WorkTask, 'id'>) => void;
  updateTask: (id: string, patch: Partial<WorkTask>) => void;
  toggleTaskStatus: (id: string) => void;
  deleteTask: (id: string) => void;
  addTransaction: (tx: Omit<FinanceTransaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  addQuickNote: (note: { title: string; content: string; folder?: QuickNoteItem['folder'] }) => QuickNoteItem;
  updateQuickNote: (id: string, patch: Partial<QuickNoteItem>) => void;
  deleteQuickNote: (id: string) => void;
  addProject: (title: string, description?: string) => ProjectItem;
  deleteProject: (id: string) => void;
  addMindmapBranch: (projectId: string, parentNodeId: string, title?: string, subtitle?: string) => void;
  updateMindmapNode: (projectId: string, nodeId: string, patch: { title?: string; subtitle?: string }) => void;
  deleteMindmapNode: (projectId: string, nodeId: string) => void;
  resetWebWorkspaceDemo: () => void;
}

function makeUid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useWebWorkspaceStore = create<WebWorkspaceState>()(
  persist(
    (set) => ({
      tasks: INITIAL_TASKS,
      transactions: INITIAL_TRANSACTIONS,
      notes: INITIAL_NOTES,
      projects: INITIAL_PROJECTS,

      addTask: (task) =>
        set((state) => ({
          tasks: [{ ...task, id: makeUid('task') }, ...state.tasks],
        })),

      updateTask: (id, patch) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      toggleTaskStatus: (id) =>
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== id) return t;
            const nextStatus: TaskStatus =
              t.status === 'pending'
                ? 'in_progress'
                : t.status === 'in_progress'
                  ? 'done'
                  : 'pending';
            return { ...t, status: nextStatus };
          }),
        })),

      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        })),

      addTransaction: (tx) =>
        set((state) => ({
          transactions: [{ ...tx, id: makeUid('tx') }, ...state.transactions],
        })),

      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.id !== id),
        })),

      addQuickNote: ({ title, content, folder = 'all' }) => {
        const created: QuickNoteItem = {
          id: makeUid('note'),
          title: title.trim() || 'Ghi chú nhanh',
          content,
          folder,
          pinned: false,
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          notes: [created, ...state.notes],
        }));
        return created;
      },

      updateQuickNote: (id, patch) =>
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id
              ? { ...n, ...patch, updatedAt: new Date().toISOString() }
              : n,
          ),
        })),

      deleteQuickNote: (id) =>
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
        })),

      addProject: (title, description = 'Bấm vào dự án để mở sơ đồ Mindmap chi tiết') => {
        const rootId = makeUid('root');
        const created: ProjectItem = {
          id: makeUid('proj'),
          title: title.trim(),
          description,
          nodes: [
            {
              id: rootId,
              parentId: null,
              title: title.trim(),
              subtitle: description,
            },
            {
              id: makeUid('node'),
              parentId: rootId,
              title: 'Nhánh mục tiêu 1',
              subtitle: 'Bấm vào để sửa nội dung hoặc bấm + để thêm nhánh con',
            },
            {
              id: makeUid('node'),
              parentId: rootId,
              title: 'Nhánh mục tiêu 2',
              subtitle: 'Phát triển ý tưởng chi tiết',
            },
          ],
        };
        set((state) => ({
          projects: [...state.projects, created],
        }));
        return created;
      },

      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        })),

      addMindmapBranch: (projectId, parentNodeId, title = 'Nhánh mới', subtitle = 'Bấm để chỉnh sửa chi tiết') =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              nodes: [
                ...p.nodes,
                {
                  id: makeUid('node'),
                  parentId: parentNodeId,
                  title,
                  subtitle,
                },
              ],
            };
          }),
        })),

      updateMindmapNode: (projectId, nodeId, patch) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            const nextNodes = p.nodes.map((n) =>
              n.id === nodeId ? { ...n, ...patch } : n,
            );
            const rootNode = nextNodes.find((n) => n.parentId === null);
            return {
              ...p,
              title: rootNode && rootNode.id === nodeId && patch.title ? patch.title : p.title,
              description:
                rootNode && rootNode.id === nodeId && patch.subtitle !== undefined
                  ? patch.subtitle
                  : p.description,
              nodes: nextNodes,
            };
          }),
        })),

      deleteMindmapNode: (projectId, nodeId) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            // Recursively collect nodeId and all its descendants
            const toDelete = new Set<string>([nodeId]);
            let added = true;
            while (added) {
              added = false;
              for (const n of p.nodes) {
                if (n.parentId && toDelete.has(n.parentId) && !toDelete.has(n.id)) {
                  toDelete.add(n.id);
                  added = true;
                }
              }
            }
            return {
              ...p,
              nodes: p.nodes.filter((n) => !toDelete.has(n.id) || n.parentId === null),
            };
          }),
        })),

      resetWebWorkspaceDemo: () =>
        set({
          tasks: INITIAL_TASKS,
          transactions: INITIAL_TRANSACTIONS,
          notes: INITIAL_NOTES,
          projects: INITIAL_PROJECTS,
        }),
    }),
    {
      name: 'notein-web-workspace-v1',
      storage: createJSONStorage(() => browserLocalStorage),
    },
  ),
);
