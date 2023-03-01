import React, { Component } from 'react';
import { formatMessage } from 'umi/locale';
import { connect } from 'dva';
import { Spin, Input } from 'antd';
import CategoryTree from '@/bdpcloud/components/CategoryTree';
import message from '@/bdpcloud/components/Message';
import { getDefaultTreeIcon } from '@/bdpcloud/components/CategoryTree/treeUtils';
import MyIcon from '@/bdpcloud/components/MyIcon';
import { arrayToTree, getPlaceholder } from '@/bdpcloud/utils/utils';
import { findTreeNodeInTreeData } from '@/pages/dd/utils/tree';
import {
  getNoteIconByType,
  TREE_NOTE_TYPE,
  TREE_CATALOGUE_TYPE,
  getMappedCatalogue,
  getMappedNote,
  refreshCatalogueNodeScriptNum,
  CATALOGUE_PATH_SEPARATOR,
  isPublicNote,
  isAdHocQueryNote,
  getNoteSuffix,
  getInitialScriptName,
} from '../utils';
import RenameNoteModal from '../components/RenameNoteModal';
import TabTitle from '../components/TabTitle';
import CreateNote from './CreateNote';
import BatchImportModal from './BatchImportModal';
import styles from './index.less';
import cn from 'classnames';
import EventBus from '@/pages/dd/offlineDev/components/work/EventBus';

const EventBusHandler = EventBus.getInstance();
const getNodeIcon = (item, treeData, expanded) => {
  const { treeNodeType, isLeafNode } = item;
  let iconType = '';
  let className = '';
  if (treeNodeType === TREE_NOTE_TYPE) {
    const { scriptType } = item;
    iconType = getNoteIconByType(scriptType);
    className = styles.treeIcon;
  } else if (treeNodeType === TREE_CATALOGUE_TYPE) {
    if (isLeafNode === 1) {
      iconType = 'iconfile';
      className = styles.treeIcon;
    } else {
      const { open, close } = getDefaultTreeIcon();
      iconType = expanded ? open : close;
    }
  }

  return <MyIcon type={iconType} className={className} />;
};

class DataDevTree extends Component {
  constructor(props) {
    super(props);
    this.currentNote = {};
    this.lastClickTreeNodeTime = 0;
    this.lastClickTreeNodeKey = '';
    this.searchValue = '';
    this.state = {
      treeData: [],
      showCreateNoteModal: false,
      showRenameNoteModal: false,
      showModal: false,
      reRenderTree: false,
    };
  }

  componentDidMount() {
    this.getCatalogueTreeData();
  }

  shouldComponentUpdate(nextProps) {
    const { activeNote } = nextProps;
    const { activeNote: preActiveNote } = this.props;
    if (activeNote.noteId !== preActiveNote.noteId && !isPublicNote(activeNote)) {
      // 当前脚本切换的时候，展开对应的父节点
      this.expandTreeByNote();
    }
    return true;
  }

  getCatalogueTreeData = async () => {
    const { getScriptsTreeData, activeNote = {} } = this.props;
    const Data = await getScriptsTreeData();
    if (Data) {
      const treeData = arrayToTree(
        Data.map(o => {
          return getMappedCatalogue(o);
        }),
        'catalogueTreeId',
        'parentId'
      );
      this.setState({ treeData });
      setTimeout(() => {
        this.expandTreeByNote(activeNote);
      }, 100);
    }
  };

  expandTreeByNote = () => {
    const { activeNote: note } = this.props;
    const { catalogueTreeId } = note;
    if (!catalogueTreeId && isAdHocQueryNote(note)) {
      return;
    }
    const { treeData } = this.state;

    const { expandedTreeKeys, saveExpandedTreeKeys } = this.props;
    const _expandedTreeKeys = [...expandedTreeKeys];
    const parentTreeNode = findTreeNodeInTreeData(catalogueTreeId, treeData, 'catalogueTreeId');
    if (!parentTreeNode || !parentTreeNode.cataFullPath) {
      return false;
    }
    const { cataFullPath } = parentTreeNode;
    const parentIds = cataFullPath.split(CATALOGUE_PATH_SEPARATOR);
    parentIds.forEach(pId => {
      if (!_expandedTreeKeys.includes(pId)) {
        _expandedTreeKeys.push(pId);
      }
    });
    saveExpandedTreeKeys(_expandedTreeKeys);
  };

  handleCreateNote = (note, Template) => {
    this.TreeNodeChangeByType(note, 'add', () => {
      message.success(formatMessage({ id: 'COMMON_COMMAND_SUCCESS', defaultMessage: '操作成功' }));
      this.onCancel();
      EventBusHandler.createNote({ ...note, Template });
    });
  };

  onTreeNodeExpand = expandedTreeKeys => {
    const { saveExpandedTreeKeys } = this.props;
    saveExpandedTreeKeys(expandedTreeKeys);
  };

  /**
   * 展开isLeafNode===1的节点，即叶子节点的时候，加载脚本列表
   * @param treeNode
   * @param callback
   * @returns {boolean}
   */
  getScripts = async (treeNode, callback) => {
    const {
      props: { dataRef },
    } = treeNode;
    const { catalogueTreeId, isLeafNode } = dataRef;
    if (!isLeafNode) {
      callback([]);
      return false;
    }
    const { projectId, getScriptListByDirId } = this.props;
    const data = await getScriptListByDirId({ catalogueTreeId, projectId });
    if (data) {
      const NodeTreeList = data.map(o => getMappedNote(o));
      callback(NodeTreeList);
    }
  };

  handleLineMenuClick = (type, item) => {
    if (type === 'remove') {
      this.handleDeleteNote(item);
    } else if (type === 'rename') {
      this.handleRename(item);
    }
  };

  handleDeleteNote = async note => {
    const { scriptId, noteId } = note;
    if (!scriptId) {
      return false;
    }
    const { deleteNote } = this.props;
    const resData = await deleteNote({ scriptId });
    if (resData) {
      this.TreeNodeChangeByType(note, 'delete', () => {
        const { removeNote } = this.props;
        removeNote({
          noteId,
          isQueryNote: false,
        });
      });
    }
  };

  handleRename = async note => {
    const { scriptId } = note;
    const { checkNotePermission } = this.props;
    const data = await checkNotePermission(scriptId);
    if (data && !data.onlyRead) {
      this.currentNote = getInitialScriptName(note);
      this.setState({ showRenameNoteModal: true });
    }
  };

  getLineMenuList = item => {
    const { treeNodeType } = item;
    let menusList = [];
    if (treeNodeType !== TREE_CATALOGUE_TYPE) {
      menusList = [
        {
          icon: 'iconedit',
          name: formatMessage({ id: 'COMMON_RENAME', defaultMessage: '重命名' }),
          type: 'rename',
        },
        {
          icon: 'icondelete',
          name: formatMessage({ id: 'COMMON_DELETE', defaultMessage: '删除' }),
          type: 'remove',
        },
      ];
    }
    return menusList;
  };

  handleRenameSuccess = async note => {
    const { updateNote, renameNote } = this.props;
    note.scriptName = `${note.scriptName}${getNoteSuffix(note.scriptType)}`;
    const resData = await updateNote({ zdevscript: note });
    if (resData) {
      renameNote(note);
      this.TreeNodeChangeByType(note, 'reName', () => {
        this.onCancel();
        message.success(formatMessage({ id: 'COMMON_SAVE_SUCCESS', defaultMessage: '保存成功' }));
      });
    }
  };

  TreeNodeChangeByType = (note, type, callback) => {
    const { noteId, catalogueTreeId } = note;
    const { treeData } = this.state;
    let newTreeData = treeData.slice();
    if (this.searchValue) {
      this.handleSearch();
      if (callback) callback();
      return;
    }
    if (type === 'reName') {
      const parentNode = findTreeNodeInTreeData(catalogueTreeId, newTreeData, 'catalogueTreeId');
      const index = parentNode.children.findIndex(o => o.noteId === noteId);
      if (index > -1) {
        parentNode.children.splice(index, 1, getMappedNote(note));
      }
    }
    if (type === 'add') {
      newTreeData = refreshCatalogueNodeScriptNum(treeData, catalogueTreeId, true);
      const parentNode = findTreeNodeInTreeData(catalogueTreeId, newTreeData, 'catalogueTreeId');
      if (!parentNode.children) {
        parentNode.children = [];
      }
      parentNode.children.push(getMappedNote(note));
    }
    if (type === 'delete') {
      newTreeData = refreshCatalogueNodeScriptNum(treeData, catalogueTreeId, false);
      const parentNode = findTreeNodeInTreeData(catalogueTreeId, newTreeData, 'catalogueTreeId');
      const index = parentNode.children.findIndex(o => o.noteId === noteId);
      if (index > -1) {
        parentNode.children.splice(index, 1);
      }
    }

    this.setState({ treeData: newTreeData });
    this.treeRef.forceUpdate();
    if (callback) callback();
  };

  handleSearch = async () => {
    const { projectId, saveExpandedTreeKeys, searchNotesByName } = this.props;
    const { searchValue } = this;
    const { treeData } = this.state;
    if (!searchValue) {
      this.setState({
        reRenderTree: true,
      });
      setTimeout(() => {
        this.setState({
          reRenderTree: false,
        });
      }, 50);
      saveExpandedTreeKeys([]);
      this.getCatalogueTreeData();
      return false;
    }
    const resultObject = await searchNotesByName({ name: searchValue, projectId });
    if (resultObject) {
      const expandedTreeKeys = [];
      const catalogueNodes = [];
      const scriptsNumObj = {};
      const notes = resultObject.map(n => {
        const { catalogueTreeId } = n;
        const parentNode = findTreeNodeInTreeData(catalogueTreeId, treeData, 'catalogueTreeId');
        if (parentNode && parentNode.cataFullPath) {
          const paths = parentNode.cataFullPath.split(CATALOGUE_PATH_SEPARATOR);
          paths.forEach(p => {
            if (!expandedTreeKeys.includes(p)) {
              expandedTreeKeys.push(p);
            }
            if (!scriptsNumObj[p]) {
              scriptsNumObj[p] = 0;
            }
            scriptsNumObj[p]++;
          });
        }
        return getMappedNote(n);
      });
      expandedTreeKeys.forEach(k => {
        const treeNode = findTreeNodeInTreeData(k, treeData, 'catalogueTreeId');
        if (!catalogueNodes.find(o => `${o.catalogueTreeId}` === k)) {
          const { children, ...rest } = treeNode;
          rest.title = `${treeNode.cataName}(${scriptsNumObj[k] || 0})`;
          catalogueNodes.push(rest);
        }
      });
      this.setState({
        treeData: arrayToTree(catalogueNodes.concat(notes), 'scriptTreeMarkId', 'parentId'),
      });
      saveExpandedTreeKeys(expandedTreeKeys);
    }
  };

  onCancel = () => {
    this.setState({
      showCreateNoteModal: false,
      showRenameNoteModal: false,
      showModal: false,
    });
  };

  onDoubleClick = (e, node) => {
    e.persist();
    const {
      props: { dataRef = {} },
    } = node;
    const { treeNodeType } = dataRef;
    if (treeNodeType === TREE_NOTE_TYPE) {
      EventBusHandler.openNote(dataRef);
    }
  };

  render() {
    const {
      treeData,
      showRenameNoteModal,
      showCreateNoteModal,
      showModal,
      reRenderTree,
    } = this.state;
    const {
      expandedTreeKeys,
      selectedNoteKeys,
      saveSelectedNoteKeys,
      projectId,
      loading = false,
      RenameNoteLoading = false,
    } = this.props;
    return (
      <div className="fullHeight">
        <TabTitle
          title={formatMessage({ id: 'dd.offlineDev.Datadevelopment', defaultMessage: '数据开发' })}
          iconList={[
            {
              icon: 'iconfile-add',
              title: formatMessage({ id: 'note.add', defaultMessage: '新建脚本' }),
              onClick: () => {
                this.setState({
                  showCreateNoteModal: true,
                });
              },
            },
            {
              icon: 'iconpiliangdaoru',
              title: formatMessage({ id: 'note.import', defaultMessage: '批量导入' }),
              onClick: () => {
                this.setState({
                  showModal: true,
                });
              },
            },
            {
              icon: 'iconreload',
              title: formatMessage({
                id: 'app.pwa.serviceworker.updated.ok',
                defaultMessage: '刷新',
              }),
              onClick: () => {
                this.handleSearch();
              },
            },
          ]}
        />
        <Spin spinning={loading} wrapperClassName={cn('full-height-spin', styles.CategoryTreeWrap)}>
          {!reRenderTree && (
            <CategoryTree
              Refs={ref => {
                this.treeRef = ref;
              }}
              renderSearch={() => {
                return (
                  <Input
                    size="small"
                    prefix={<MyIcon size="small" type="iconsearch" />}
                    placeholder={getPlaceholder(
                      formatMessage({ id: 'note.name', defaultMessage: '脚本名称' })
                    )}
                    className="ub-f1"
                    allowClear
                    onPressEnter={e => {
                      const {
                        target: { value },
                      } = e;
                      this.searchValue = value;
                      this.handleSearch();
                    }}
                  />
                );
              }}
              treeData={treeData}
              nodeIcon={getNodeIcon}
              loadAsyncData={this.getScripts}
              expandedKeys={expandedTreeKeys}
              selectedKeys={selectedNoteKeys}
              menusList={this.getLineMenuList}
              onSelect={saveSelectedNoteKeys}
              onDoubleClick={this.onDoubleClick}
              treeBoxClass={styles.TreeBox}
              menuItemClick={this.handleLineMenuClick}
              onExpand={keys => this.onTreeNodeExpand(keys)}
              shouldUpdateProps={['expandedKeys', 'selectedKeys', 'treeData']}
              loadAsyncDataDoneCallback={data => {
                this.setState({ treeData: data });
              }}
            />
          )}
        </Spin>
        <RenameNoteModal
          specialCharRule={true}
          visible={showRenameNoteModal}
          title={formatMessage({ id: 'note.rename.title', defaultMessage: '修改脚本名称' })}
          onCancel={this.onCancel}
          FromData={this.currentNote}
          onOk={this.handleRenameSuccess}
          loading={RenameNoteLoading}
        />
        {showCreateNoteModal && (
          <CreateNote
            projectId={projectId}
            treeData={treeData}
            handleOk={this.handleCreateNote}
            visible={showCreateNoteModal}
            selectedTreeKey={selectedNoteKeys.length ? selectedNoteKeys[0] : ''}
            onCancel={this.onCancel}
          />
        )}

        {showModal && (
          <BatchImportModal
            projectId={projectId}
            visible={showModal}
            initTreeData={treeData}
            TREE_CATALOGUE_TYPE={TREE_CATALOGUE_TYPE}
            selectedTreeKey={selectedNoteKeys.length ? selectedNoteKeys[0] : ''}
            treeDefaultExpandedKeys={expandedTreeKeys}
            onClose={this.onCancel}
            onOk={() => {
              this.setState({
                showModal: false,
              });
              this.handleSearch();
            }}
          />
        )}
      </div>
    );
  }
}

export default connect(
  ({ loading, workSpace }) => ({
    projectId: workSpace.projectId,
    // 数据开发
    expandedTreeKeys: workSpace.expandedTreeKeys || [],
    selectedNoteKeys: workSpace.selectedNoteKeys || [],
    activeNote: workSpace.activeNote || {},
    loading:
      loading.effects['workSpace/getScriptsTreeData'] ||
      loading.effects['workSpace/searchNotesByName'],
    RenameNoteLoading:
      loading.effects['workSpace/updateNote'] || loading.effects['workSpace/deleteNote'],
  }),
  dispatch => {
    return {
      dispatch,
      getScriptsTreeData: () => {
        return dispatch({
          type: 'workSpace/getScriptsTreeData',
          payload: {},
        });
      },
      searchNotesByName: payload => {
        return dispatch({
          type: 'workSpace/searchNotesByName',
          payload,
        });
      },
      getScriptListByDirId: ({ catalogueTreeId, projectId }) => {
        return dispatch({
          type: 'workSpace/getScriptListByDirId',
          payload: {
            catalogueTreeId,
            projectId,
          },
        });
      },
      saveExpandedTreeKeys: expandedTreeKeys => {
        return dispatch({
          type: 'workSpace/save',
          payload: {
            expandedTreeKeys,
          },
        });
      },
      checkNotePermission: scriptId =>
        dispatch({
          type: 'workSpace/getNotePermission',
          payload: {
            scriptId,
          },
        }),
      saveSelectedNoteKeys: selectedNoteKeys => {
        return dispatch({
          type: 'workSpace/save',
          payload: {
            selectedNoteKeys,
          },
        });
      },
      updateNote: payload =>
        dispatch({
          type: 'workSpace/updateNote',
          payload,
        }),
      renameNote: payload =>
        dispatch({
          type: 'workSpace/renameNote',
          payload,
        }),
      deleteNote: payload =>
        dispatch({
          type: 'workSpace/deleteNote',
          payload,
        }),
      removeNote: payload =>
        dispatch({
          type: 'workSpace/removeNote',
          payload,
        }),
    };
  }
)(DataDevTree);
