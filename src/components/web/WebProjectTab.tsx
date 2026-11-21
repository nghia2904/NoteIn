import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useScheduleStore } from '../../store/scheduleStore';
import {
  type MindmapNode,
  type ProjectItem,
  useWebWorkspaceStore,
} from '../../store/webWorkspaceStore';

interface WebProjectTabProps {
  initialProjectId?: string | null;
}

export function WebProjectTab({ initialProjectId = null }: WebProjectTabProps) {
  const { language, theme } = useScheduleStore();
  const {
    projects,
    addProject,
    deleteProject,
    addMindmapBranch,
    updateMindmapNode,
    deleteMindmapNode,
  } = useWebWorkspaceStore();

  const isDark = theme === 'dark';
  const isVi = language === 'vi';

  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    initialProjectId,
  );
  const [newProjectInput, setNewProjectInput] = useState('');
  const [zoomPct, setZoomPct] = useState<number>(100);

  // Node edit modal state
  const [editingNode, setEditingNode] = useState<MindmapNode | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');

  useEffect(() => {
    if (initialProjectId) {
      setActiveProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  const activeProject: ProjectItem | undefined = projects.find(
    (p) => p.id === activeProjectId,
  );

  const handleCreateProjectFromOrbit = () => {
    const title = newProjectInput.trim();
    if (!title) return;
    addProject(title);
    setNewProjectInput('');
  };

  const openEditNodeModal = (node: MindmapNode) => {
    setEditingNode(node);
    setEditTitle(node.title);
    setEditSubtitle(node.subtitle);
  };

  const handleSaveNodeEdit = () => {
    if (!activeProject || !editingNode) return;
    updateMindmapNode(activeProject.id, editingNode.id, {
      title: editTitle.trim() || (isVi ? 'Nhánh chưa đặt tên' : 'Untitled branch'),
      subtitle: editSubtitle.trim(),
    });
    setEditingNode(null);
  };

  const handleDeleteNode = () => {
    if (!activeProject || !editingNode || editingNode.parentId === null) return;
    deleteMindmapNode(activeProject.id, editingNode.id);
    setEditingNode(null);
  };

  // Recursive Mindmap Tree Renderer matching Screenshot 3
  const renderMindmapSubtree = (
    project: ProjectItem,
    node: MindmapNode,
    depth: number,
  ): React.ReactNode => {
    const children = project.nodes.filter((n) => n.parentId === node.id);
    const isRoot = node.parentId === null;

    return (
      <View key={node.id} style={styles.subtreeRow}>
        {/* Node Card */}
        <Pressable
          onPress={() => openEditNodeModal(node)}
          style={[
            styles.mindNodeCard,
            isRoot ? styles.mindNodeRoot : isDark ? styles.mindNodeDark : styles.mindNodeBranch,
          ]}
        >
          <View style={styles.mindNodeHeader}>
            <Text
              style={[
                styles.mindNodeTitle,
                isRoot ? styles.mindNodeTitleRoot : isDark && styles.textDark,
              ]}
              numberOfLines={2}
            >
              {node.title}
            </Text>

            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                addMindmapBranch(
                  project.id,
                  node.id,
                  isVi ? 'Nhánh mới' : 'New branch',
                  isVi ? 'Bấm để ghi chi tiết' : 'Click to edit details',
                );
              }}
              style={[styles.addBranchPlusBtn, isRoot && styles.addBranchPlusBtnRoot]}
            >
              <Text
                style={[
                  styles.addBranchPlusText,
                  isRoot && styles.addBranchPlusTextRoot,
                ]}
              >
                +
              </Text>
            </Pressable>
          </View>

          {node.subtitle ? (
            <Text
              style={[
                styles.mindNodeSub,
                isRoot ? styles.mindNodeSubRoot : isDark && styles.subTextDark,
              ]}
              numberOfLines={3}
            >
              {node.subtitle}
            </Text>
          ) : null}
        </Pressable>

        {/* Connector & Children Column */}
        {children.length > 0 && (
          <View style={styles.childrenBranchArea}>
            {/* Outgoing stem from parent */}
            <View style={styles.stemOut} />

            {/* Vertical spine & child rows */}
            <View style={styles.childrenColumn}>
              {children.map((child, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === children.length - 1;
                const isOnly = children.length === 1;

                return (
                  <View key={child.id} style={styles.childBranchWrapper}>
                    {/* Left vertical connector spine segment + horizontal arm */}
                    <View style={styles.connectorBox}>
                      {!isOnly && (
                        <>
                          <View
                            style={[
                              styles.spineTop,
                              isFirst && styles.spineHidden,
                            ]}
                          />
                          <View
                            style={[
                              styles.spineBottom,
                              isLast && styles.spineHidden,
                            ]}
                          />
                        </>
                      )}
                      <View style={styles.armIn} />
                    </View>

                    {/* Recursive Child Subtree */}
                    {renderMindmapSubtree(project, child, depth + 1)}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>
    );
  };

  // ============================================================================
  // VIEW 2: INTERACTIVE MINDMAP VIEW (Screenshot 3)
  // ============================================================================
  if (activeProject) {
    const rootNode =
      activeProject.nodes.find((n) => n.parentId === null) ??
      activeProject.nodes[0];

    return (
      <View style={styles.root}>
        {/* Top Mindmap Header Bar */}
        <View style={styles.mindmapHeader}>
          <View style={styles.mindmapTitleGroup}>
            <Pressable
              onPress={() => setActiveProjectId(null)}
              style={[styles.backOrbitBtn, isDark && styles.cardDark]}
            >
              <Text style={[styles.backOrbitText, isDark && styles.textDark]}>
                ← {isVi ? 'Quỹ đạo' : 'Orbit'}
              </Text>
            </Pressable>
            <Text style={[styles.mindmapProjectTitle, isDark && styles.textDark]}>
              {activeProject.title}
            </Text>
          </View>

          {/* Zoom Controls Pill (- 100% +) */}
          <View style={[styles.zoomPill, isDark && styles.cardDark]}>
            <Pressable
              onPress={() => setZoomPct((z) => Math.max(60, z - 10))}
              style={styles.zoomBtn}
            >
              <Text style={[styles.zoomBtnText, isDark && styles.textDark]}>−</Text>
            </Pressable>
            <Text style={[styles.zoomPctText, isDark && styles.textDark]}>
              {zoomPct}%
            </Text>
            <Pressable
              onPress={() => setZoomPct((z) => Math.min(140, z + 10))}
              style={styles.zoomBtn}
            >
              <Text style={[styles.zoomBtnText, isDark && styles.textDark]}>+</Text>
            </Pressable>
            <Pressable onPress={() => setZoomPct(100)} style={styles.zoomBtn}>
              <Text style={[styles.zoomBtnText, isDark && styles.textDark]}>⤢</Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.mindmapHint, isDark && styles.subTextDark]}>
          {isVi
            ? '💡 Bấm dấu (+) trên bất kỳ thẻ nào để thêm nhánh con mới. Bấm vào thẻ để chỉnh sửa nội dung.'
            : '💡 Click (+) on any node to add a child branch. Click any node card to edit its text.'}
        </Text>

        {/* Scrollable 2D Canvas for Mindmap */}
        <ScrollView
          horizontal
          style={styles.mindmapCanvasScroll}
          contentContainerStyle={styles.mindmapHorizontalContent}
          showsHorizontalScrollIndicator
        >
          <ScrollView
            contentContainerStyle={styles.mindmapVerticalContent}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                transform: [{ scale: zoomPct / 100 }],
              }}
            >
              {rootNode ? renderMindmapSubtree(activeProject, rootNode, 0) : null}
            </View>
          </ScrollView>
        </ScrollView>

        {/* Edit Mindmap Node Modal */}
        <Modal
          visible={Boolean(editingNode)}
          transparent
          animationType="fade"
          onRequestClose={() => setEditingNode(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, isDark && styles.cardDark]}>
              <Text style={[styles.modalTitle, isDark && styles.textDark]}>
                {isVi ? 'Chỉnh sửa nhánh Mindmap' : 'Edit Mindmap Branch'}
              </Text>

              <Text style={[styles.fieldLabel, isDark && styles.subTextDark]}>
                {isVi ? 'TIÊU ĐỀ NHÁNH' : 'BRANCH TITLE'}
              </Text>
              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder={isVi ? 'Nhập tên nhánh...' : 'Branch title...'}
                placeholderTextColor="#9ca3af"
                style={[styles.modalInput, isDark && styles.inputDark]}
              />

              <Text style={[styles.fieldLabel, isDark && styles.subTextDark]}>
                {isVi ? 'GHI CHÚ / MÔ TẢ CHI TIẾT' : 'SUBTITLE / NOTES'}
              </Text>
              <TextInput
                value={editSubtitle}
                onChangeText={setEditSubtitle}
                placeholder={isVi ? 'Mô tả nội dung của nhánh này...' : 'Branch description...'}
                placeholderTextColor="#9ca3af"
                multiline
                style={[
                  styles.modalInput,
                  { minHeight: 80, textAlignVertical: 'top' },
                  isDark && styles.inputDark,
                ]}
              />

              <View style={styles.modalActionsRow}>
                {editingNode?.parentId !== null && (
                  <Pressable onPress={handleDeleteNode} style={styles.deleteNodeBtn}>
                    <Text style={styles.deleteNodeText}>
                      🗑 {isVi ? 'Xóa nhánh' : 'Delete'}
                    </Text>
                  </Pressable>
                )}
                <View style={{ flex: 1 }} />
                <Pressable
                  onPress={() => setEditingNode(null)}
                  style={styles.cancelModalBtn}
                >
                  <Text style={styles.cancelModalText}>
                    {isVi ? 'Hủy' : 'Cancel'}
                  </Text>
                </Pressable>
                <Pressable onPress={handleSaveNodeEdit} style={styles.saveModalBtn}>
                  <Text style={styles.saveModalText}>
                    {isVi ? 'Lưu thay đổi' : 'Save'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ============================================================================
  // VIEW 1: ORBIT OVERVIEW (Screenshot 2)
  // ============================================================================
  const orbitRadiusX = 240;
  const orbitRadiusY = 185;
  const centerX = 340;
  const centerY = 235;

  return (
    <View style={styles.root}>
      {/* Top Header */}
      <View style={styles.orbitTopBar}>
        <Text style={[styles.pageTitle, isDark && styles.textDark]}>Project</Text>
        <Text style={[styles.projectCountText, isDark && styles.subTextDark]}>
          {projects.length} PROJECTS
        </Text>
      </View>

      {/* Center Solar System Orbit Area */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.orbitScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.orbitStage}>
          {/* Outer Orbit Ring */}
          <View style={[styles.orbitRingOuter, isDark && styles.orbitRingDark]} />
          <View style={[styles.orbitRingInner, isDark && styles.orbitRingDark]} />

          {/* Glowing Center Core (Black sphere with golden core matching Screenshot 2) */}
          <View style={styles.coreHalo}>
            <View style={styles.coreSphere}>
              <View style={styles.coreOrbitLine} />
              <View style={styles.coreGoldSun} />
            </View>
          </View>

          {/* Project Cards positioned around the Orbit */}
          {projects.map((proj, index) => {
            const total = Math.max(projects.length, 1);
            const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
            const left = centerX + Math.cos(angle) * orbitRadiusX - 105;
            const top = centerY + Math.sin(angle) * orbitRadiusY - 58;
            const branchCount = Math.max(0, proj.nodes.length - 1);

            return (
              <Pressable
                key={proj.id}
                onPress={() => setActiveProjectId(proj.id)}
                style={[
                  styles.orbitProjectCard,
                  isDark && styles.cardDark,
                  { left, top },
                ]}
              >
                <View style={styles.orbitCardHeader}>
                  <Text
                    style={[styles.orbitCardTitle, isDark && styles.textDark]}
                    numberOfLines={2}
                  >
                    {proj.title}
                  </Text>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation?.();
                      deleteProject(proj.id);
                    }}
                    style={styles.orbitDeleteBtn}
                  >
                    <Text style={styles.orbitDeleteText}>✕</Text>
                  </Pressable>
                </View>

                <Text
                  style={[styles.orbitCardDesc, isDark && styles.subTextDark]}
                  numberOfLines={2}
                >
                  {proj.description}
                </Text>

                <Text style={styles.orbitBranchCount}>
                  {branchCount} {isVi ? 'nhánh' : 'branches'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Floating Input Pill ("Một project đang nghĩ tới..." + ↑) */}
      <View style={styles.bottomInputWrap}>
        <View style={[styles.bottomInputPill, isDark && styles.cardDark]}>
          <TextInput
            value={newProjectInput}
            onChangeText={setNewProjectInput}
            onSubmitEditing={handleCreateProjectFromOrbit}
            placeholder={
              isVi
                ? 'Một project đang nghĩ tới...'
                : 'A project you are thinking about...'
            }
            placeholderTextColor="#9ca3af"
            style={[styles.bottomTextInput, isDark && styles.textDark]}
          />
          <Pressable
            onPress={handleCreateProjectFromOrbit}
            style={styles.bottomSendCircle}
          >
            <Text style={styles.bottomSendArrow}>↑</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 20,
  },
  orbitTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.7,
  },
  projectCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 1,
  },
  orbitScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitStage: {
    width: 680,
    height: 470,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitRingOuter: {
    position: 'absolute',
    width: 470,
    height: 370,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.1)',
  },
  orbitRingInner: {
    position: 'absolute',
    width: 260,
    height: 200,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.05)',
  },
  orbitRingDark: {
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  coreHalo: {
    width: 82,
    height: 82,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  coreSphere: {
    width: 64,
    height: 64,
    borderRadius: 99,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreOrbitLine: {
    position: 'absolute',
    width: 46,
    height: 20,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.45)',
  },
  coreGoldSun: {
    width: 14,
    height: 14,
    borderRadius: 99,
    backgroundColor: '#facc15',
  },
  orbitProjectCard: {
    position: 'absolute',
    width: 210,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 5,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  orbitCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
  orbitCardTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 18,
  },
  orbitDeleteBtn: {
    paddingHorizontal: 4,
  },
  orbitDeleteText: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '700',
  },
  orbitCardDesc: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 15,
  },
  orbitBranchCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9ca3af',
    marginTop: 2,
  },
  bottomInputWrap: {
    alignItems: 'center',
    paddingTop: 8,
  },
  bottomInputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 460,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 99,
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bottomTextInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    paddingVertical: 6,
  },
  bottomSendCircle: {
    width: 34,
    height: 34,
    borderRadius: 99,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSendArrow: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  // Mindmap View Styles
  mindmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  mindmapTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backOrbitBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  backOrbitText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  mindmapProjectTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.6,
  },
  zoomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  zoomBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  zoomBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  zoomPctText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
  },
  mindmapHint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 14,
  },
  mindmapCanvasScroll: {
    flex: 1,
  },
  mindmapHorizontalContent: {
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  mindmapVerticalContent: {
    justifyContent: 'center',
    paddingBottom: 60,
  },
  subtreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mindNodeCard: {
    width: 195,
    borderRadius: 15,
    padding: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  mindNodeRoot: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  mindNodeBranch: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mindNodeDark: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  mindNodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  mindNodeTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 17,
  },
  mindNodeTitleRoot: {
    color: '#ffffff',
    fontSize: 13,
  },
  mindNodeSub: {
    fontSize: 10,
    color: '#6b7280',
    lineHeight: 14,
  },
  mindNodeSubRoot: {
    color: '#d4d4d8',
  },
  addBranchPlusBtn: {
    width: 22,
    height: 22,
    borderRadius: 99,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBranchPlusBtnRoot: {
    backgroundColor: '#3f3f46',
  },
  addBranchPlusText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4b5563',
    lineHeight: 16,
  },
  addBranchPlusTextRoot: {
    color: '#ffffff',
  },
  childrenBranchArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stemOut: {
    width: 26,
    height: 2,
    backgroundColor: '#cbd5e1',
  },
  childrenColumn: {
    flexDirection: 'column',
  },
  childBranchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  connectorBox: {
    width: 28,
    alignSelf: 'stretch',
    justifyContent: 'center',
    position: 'relative',
  },
  spineTop: {
    position: 'absolute',
    left: 0,
    top: -10,
    bottom: '50%',
    width: 2,
    backgroundColor: '#cbd5e1',
  },
  spineBottom: {
    position: 'absolute',
    left: 0,
    top: '50%',
    bottom: -10,
    width: 2,
    backgroundColor: '#cbd5e1',
  },
  spineHidden: {
    backgroundColor: 'transparent',
  },
  armIn: {
    width: 28,
    height: 2,
    backgroundColor: '#cbd5e1',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
  },
  modalInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
  },
  inputDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    color: '#f8fafc',
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  deleteNodeBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  deleteNodeText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelModalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  cancelModalText: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '700',
  },
  saveModalBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveModalText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  textDark: {
    color: '#f8fafc',
  },
  subTextDark: {
    color: '#94a3b8',
  },
});
