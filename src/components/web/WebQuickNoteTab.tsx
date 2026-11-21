import { format, parseISO } from 'date-fns';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useScheduleStore } from '../../store/scheduleStore';
import {
  type QuickNoteItem,
  useWebWorkspaceStore,
} from '../../store/webWorkspaceStore';

export function WebQuickNoteTab() {
  const { language, theme } = useScheduleStore();
  const { notes, addQuickNote, updateQuickNote, deleteQuickNote } =
    useWebWorkspaceStore();

  const isDark = theme === 'dark';
  const isVi = language === 'vi';

  const [selectedFolder, setSelectedFolder] = useState<
    'all' | 'pinned' | 'work' | 'personal' | 'ideas'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string>(
    () => notes[0]?.id ?? '',
  );

  const filteredNotes = useMemo(() => {
    return [...notes]
      .filter((n) => {
        if (selectedFolder === 'pinned' && !n.pinned) return false;
        if (
          selectedFolder !== 'all' &&
          selectedFolder !== 'pinned' &&
          n.folder !== selectedFolder
        ) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            n.title.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [notes, selectedFolder, searchQuery]);

  const activeNote: QuickNoteItem | undefined =
    notes.find((n) => n.id === selectedNoteId) ?? filteredNotes[0];

  const handleCreateNewNote = () => {
    const folder: QuickNoteItem['folder'] =
      selectedFolder === 'work' ||
      selectedFolder === 'personal' ||
      selectedFolder === 'ideas'
        ? selectedFolder
        : 'all';
    const created = addQuickNote({
      title: isVi ? 'Ghi chú mới' : 'New Note',
      content: '',
      folder,
    });
    setSelectedNoteId(created.id);
  };

  const handleInsertBullet = (prefix: string) => {
    if (!activeNote) return;
    const nextContent = activeNote.content
      ? `${activeNote.content}\n${prefix}`
      : prefix;
    updateQuickNote(activeNote.id, { content: nextContent });
  };

  const folders = [
    { id: 'all', label: isVi ? '📁 Tất cả' : '📁 All' },
    { id: 'pinned', label: isVi ? '📌 Đã ghim' : '📌 Pinned' },
    { id: 'work', label: isVi ? '💼 Công việc' : '💼 Work' },
    { id: 'ideas', label: isVi ? '💡 Ý tưởng' : '💡 Ideas' },
    { id: 'personal', label: isVi ? '🌿 Cá nhân' : '🌿 Personal' },
  ] as const;

  return (
    <View style={styles.root}>
      {/* Top Bar */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.appleNotesBadge}>APPLE NOTES STYLE · AUTO-SAVED</Text>
          <Text style={[styles.pageTitle, isDark && styles.textDark]}>
            Quick Note
          </Text>
        </View>
        <Pressable onPress={handleCreateNewNote} style={styles.newNoteBtn}>
          <Text style={styles.newNoteBtnText}>
            ✎ {isVi ? 'Tạo ghi chú mới' : 'New Note'}
          </Text>
        </Pressable>
      </View>

      {/* Folder Filter Strip */}
      <View style={styles.folderBar}>
        {folders.map((f) => {
          const active = selectedFolder === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setSelectedFolder(f.id)}
              style={[
                styles.folderPill,
                isDark && styles.cardDark,
                active && styles.folderPillActive,
              ]}
            >
              <Text
                style={[
                  styles.folderPillText,
                  isDark && styles.textDark,
                  active && styles.folderPillTextActive,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Split View: Left Note List + Right iOS Notes Editor */}
      <View style={styles.splitWrap}>
        {/* Left List */}
        <View style={[styles.listPanel, isDark && styles.cardDark]}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={isVi ? '🔍 Tìm kiếm ghi chú...' : '🔍 Search notes...'}
            placeholderTextColor="#9ca3af"
            style={[styles.searchInput, isDark && styles.inputDark]}
          />

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.noteListContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredNotes.length === 0 ? (
              <Text style={styles.emptyText}>
                {isVi ? 'Không có ghi chú nào.' : 'No notes found.'}
              </Text>
            ) : (
              filteredNotes.map((item) => {
                const selected = activeNote?.id === item.id;
                let dateDisplay = '';
                try {
                  dateDisplay = format(parseISO(item.updatedAt), 'HH:mm · dd/MM');
                } catch {
                  dateDisplay = '';
                }
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setSelectedNoteId(item.id)}
                    style={[
                      styles.noteCard,
                      isDark && styles.rowDark,
                      selected && styles.noteCardSelected,
                    ]}
                  >
                    <View style={styles.noteCardTop}>
                      <Text
                        style={[
                          styles.noteCardTitle,
                          isDark && styles.textDark,
                          selected && styles.noteCardTitleSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {item.pinned ? '📌 ' : ''}
                        {item.title || (isVi ? 'Chưa đặt tiêu đề' : 'Untitled')}
                      </Text>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.();
                          updateQuickNote(item.id, { pinned: !item.pinned });
                        }}
                        style={styles.pinIconQuickBtn}
                      >
                        <Text style={{ fontSize: 11, opacity: item.pinned ? 1 : 0.35 }}>
                          📌
                        </Text>
                      </Pressable>
                    </View>
                    <Text
                      style={[
                        styles.noteCardPreview,
                        selected && styles.noteCardPreviewSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {item.content || (isVi ? 'Chưa có nội dung...' : 'No content...')}
                    </Text>
                    <View style={styles.noteCardFooterRow}>
                      <Text
                        style={[
                          styles.noteCardDate,
                          selected && styles.noteCardPreviewSelected,
                        ]}
                      >
                        {dateDisplay}
                      </Text>
                      {item.folder !== 'all' && (
                        <Text style={styles.noteFolderBadge}>
                          {item.folder === 'work'
                            ? isVi
                              ? '💼 Công việc'
                              : '💼 Work'
                            : item.folder === 'ideas'
                              ? isVi
                                ? '💡 Ý tưởng'
                                : '💡 Ideas'
                              : isVi
                                ? '🌿 Cá nhân'
                                : '🌿 Personal'}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* Right iOS Notes Rich Editor */}
        <View style={[styles.editorPanel, isDark && styles.cardDark]}>
          {activeNote ? (
            <>
              {/* Editor Top Toolbar */}
              <View style={styles.editorToolbar}>
                <View style={styles.formatBtnsRow}>
                  <Pressable
                    onPress={() => handleInsertBullet('• ')}
                    style={[styles.toolBtn, isDark && styles.rowDark]}
                  >
                    <Text style={[styles.toolBtnText, isDark && styles.textDark]}>
                      • {isVi ? 'Danh sách' : 'Bullet'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleInsertBullet('☐ ')}
                    style={[styles.toolBtn, isDark && styles.rowDark]}
                  >
                    <Text style={[styles.toolBtnText, isDark && styles.textDark]}>
                      ☑ Checklist
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      updateQuickNote(activeNote.id, { pinned: !activeNote.pinned })
                    }
                    style={[
                      styles.toolBtn,
                      activeNote.pinned && styles.toolBtnPinned,
                      isDark && styles.rowDark,
                    ]}
                  >
                    <Text
                      style={[
                        styles.toolBtnText,
                        isDark && styles.textDark,
                        activeNote.pinned && styles.toolBtnPinnedText,
                      ]}
                    >
                      📌{' '}
                      {activeNote.pinned
                        ? isVi
                          ? 'Đã ghim (Bấm để bỏ)'
                          : 'Pinned'
                        : isVi
                          ? 'Ghim ghi chú'
                          : 'Pin Note'}
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => deleteQuickNote(activeNote.id)}
                  style={styles.deleteNoteBtn}
                >
                  <Text style={styles.deleteNoteText}>
                    🗑 {isVi ? 'Xóa' : 'Delete'}
                  </Text>
                </Pressable>
              </View>

              {/* Folder Assignment Row: Put Note into Công việc / Ý tưởng / Cá nhân */}
              <View style={[styles.assignFolderBar, isDark && styles.rowDark]}>
                <Text style={[styles.assignFolderLabel, isDark && styles.subTextDark]}>
                  {isVi ? 'Phân loại vào mục:' : 'Move to folder:'}
                </Text>
                {(
                  [
                    { id: 'work', label: isVi ? '💼 Công việc' : '💼 Work' },
                    { id: 'ideas', label: isVi ? '💡 Ý tưởng' : '💡 Ideas' },
                    { id: 'personal', label: isVi ? '🌿 Cá nhân' : '🌿 Personal' },
                  ] as const
                ).map((f) => {
                  const isAssigned = activeNote.folder === f.id;
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() =>
                        updateQuickNote(activeNote.id, {
                          folder: isAssigned ? 'all' : f.id,
                        })
                      }
                      style={[
                        styles.assignFolderChip,
                        isDark && styles.cardDark,
                        isAssigned && styles.assignFolderChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.assignFolderChipText,
                          isDark && styles.textDark,
                          isAssigned && styles.assignFolderChipTextActive,
                        ]}
                      >
                        {isAssigned ? '✓ ' : ''}
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.editorTimestamp}>
                {isVi ? 'Đã tự động lưu vào trình duyệt · ' : 'Auto-saved locally · '}
                {(() => {
                  try {
                    return format(parseISO(activeNote.updatedAt), 'HH:mm, dd/MM/yyyy');
                  } catch {
                    return '';
                  }
                })()}
              </Text>

              <TextInput
                value={activeNote.title}
                onChangeText={(val) => updateQuickNote(activeNote.id, { title: val })}
                placeholder={isVi ? 'Tiêu đề ghi chú...' : 'Note title...'}
                placeholderTextColor="#9ca3af"
                style={[styles.editorTitleInput, isDark && styles.textDark]}
              />

              <TextInput
                value={activeNote.content}
                onChangeText={(val) => updateQuickNote(activeNote.id, { content: val })}
                placeholder={
                  isVi
                    ? 'Bắt đầu gõ nội dung ghi chú, ý tưởng, checklist của bạn tại đây...'
                    : 'Start typing your note, ideas, or checklist here...'
                }
                placeholderTextColor="#9ca3af"
                multiline
                textAlignVertical="top"
                style={[styles.editorBodyInput, isDark && styles.textDark]}
              />
            </>
          ) : (
            <View style={styles.emptyEditor}>
              <Text style={styles.emptyText}>
                {isVi
                  ? 'Hãy chọn 1 ghi chú hoặc bấm "+ Tạo ghi chú mới"'
                  : 'Select a note or click "+ New Note"'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 24,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appleNotesBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#d97706',
    letterSpacing: 1,
    marginBottom: 2,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  newNoteBtn: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 11,
  },
  newNoteBtnText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },
  folderBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  folderPill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  folderPillActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  folderPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
  },
  folderPillTextActive: {
    color: '#ffffff',
  },
  splitWrap: {
    flex: 1,
    flexDirection: 'row',
    gap: 18,
  },
  listPanel: {
    width: 310,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#111827',
  },
  inputDark: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
  },
  noteListContent: {
    gap: 8,
    paddingBottom: 20,
  },
  noteCard: {
    padding: 12,
    borderRadius: 13,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 4,
  },
  rowDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  noteCardSelected: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  noteCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  noteCardTitleSelected: {
    color: '#92400e',
  },
  noteCardPreview: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  noteCardPreviewSelected: {
    color: '#78350f',
  },
  noteCardDate: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 2,
  },
  editorPanel: {
    flex: 1,
    backgroundColor: '#fffef9',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  editorToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingBottom: 12,
  },
  formatBtnsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toolBtn: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toolBtnPinned: {
    backgroundColor: '#fef3c7',
  },
  toolBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  deleteNoteBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteNoteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  editorTimestamp: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    textAlign: 'center',
  },
  editorTitleInput: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    paddingVertical: 4,
  },
  editorBodyInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: '#1f2937',
    paddingTop: 8,
  },
  emptyEditor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
  pinIconQuickBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  noteCardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  noteFolderBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4b5563',
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 99,
  },
  toolBtnPinnedText: {
    color: '#92400e',
    fontWeight: '800',
  },
  assignFolderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  assignFolderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    marginRight: 4,
  },
  assignFolderChip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  assignFolderChipActive: {
    backgroundColor: '#18181b',
    borderColor: '#18181b',
  },
  assignFolderChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  assignFolderChipTextActive: {
    color: '#ffffff',
  },
  textDark: {
    color: '#f8fafc',
  },
  subTextDark: {
    color: '#94a3b8',
  },
});
