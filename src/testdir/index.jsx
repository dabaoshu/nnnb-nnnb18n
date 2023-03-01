import React from 'react';
import { formatMessage } from 'umi/locale';
import Jsplumb from 'jsplumb';
import { connect } from 'dva';
import { Spin, Tooltip, Popconfirm, Modal } from 'antd';
import MyIcon from '@/bdpcloud/components/MyIcon';
import message from '@/bdpcloud/components/Message';
import ClosableTip from '@/pages/dd/components/ClosableTip';
import { defaultHandleResponse, hocResponse, getRandomRowKey } from '@/pages/dd/utils/utils';
import { findTreeNodeInTreeData } from '@/pages/dd/utils/tree';
import {
  getDependencyRelation,
  saveDependencyRelation,
} from '@/pages/dd/offlineDev/services/dataintegService';
import { getDatasourceByTableId, dataBloodAnalyse } from '@/pages/dd/offlineDev/services/project';
import { getTableCodeList } from '@/pages/dd/offlineDev/services/projectDatasourceMapService';
import classnames from 'classnames';
import { SCRIPT_TYPE_PYTHON, SCRIPT_TYPE_SQL } from '../../../utils';
import styles from './index.less';
import DataSourceSelect from '@/pages/dd/offlineDev/components/work/components/DataSourceSelect';
import TableSelect from './tableSelect';
import TaskDepend from './TaskDepend';

const jsPlumbIn = Jsplumb.jsPlumb;
const jsplumbContainerId = 'taskDataDependencyJsPlumbBox';

const paintStyle = {
  stroke: '#52C41A',
  fill: '#fff',
  radius: 4,
  strokeWidth: 1,
};
const connectorStyle = {
  strokeWidth: 1,
  stroke: '#BFBFBF',
  joinstyle: 'round',
  outlineStroke: 'transparent',
  outlineWidth: 2,
};

class TaskDataDependency extends React.Component {
  constructor(props) {
    super(props);
    const { Ref } = props;
    if (Ref) {
      Ref(this);
    }
    this.jsPlumbInstance = null;
    this.middleElemId = getRandomRowKey();
    this.middleEndPointLeftId = getRandomRowKey();
    this.middleEndPointRightId = getRandomRowKey();
    this.dirty = false;
    this.state = {
      getRelationLoading: true,
      inputs: [],
      outputs: [],
      tablesObj: {},
      getTablesLoading: {},
      datasourceTreeData: [],
    };
  }

  componentDidMount() {
    this.init();
    try {
      // eslint-disable-next-line prefer-destructuring
      this.modalRef = document.getElementsByClassName('taskConfigModal')[0];
    } catch (error) {
      console.log(error);
    }
  }

  init = () => {
    this.getData();
  };

  getData = () => {
    this.destroyJsPlumb();
    this.initJsPlumb();
    const {
      note: { scriptId },
    } = this.props;
    this.setState({ inputs: [], outputs: [] });
    getDependencyRelation({ taskId: scriptId }).then(response => {
      this.setState({ getRelationLoading: false });
      let relationList = [];
      defaultHandleResponse(response, (resultObject = {}) => {
        ({ relationList } = resultObject);
      });
      const inputs = [];
      const outputs = [];
      const inputMarks = [];
      const outputMarks = [];
      const datasourceIds = [];
      relationList.forEach(item => {
        /*
           查出来的数据是一对一的，就是说是这样的结构：inputSchema.inputTable <--> outputSchema.outputTable
           但是有可能会有重复的input数据或者output数据，比如：
           inputSchema1.inputTable1 <--> outputSchema1.outputTable1
           inputSchema2.inputTable2 <--> outputSchema1.outputTable1
           这时候，左侧应有两行数据，而右侧却只能有1条数据，因为右边的值都是一样的，不需要重复渲染，所以我准备了两个数组inputMarks和outputMarks用于装载已有的记录
        */
        const { inputSchema, inputTable, outputSchema, outputTable } = item;
        if (!datasourceIds.includes(inputSchema)) {
          datasourceIds.push(inputSchema);
        }
        if (!datasourceIds.includes(outputSchema)) {
          datasourceIds.push(outputSchema);
        }
        const inputMark = `${inputSchema}.${inputTable}`;
        const outputMark = `${outputSchema}.${outputTable}`;
        if (!inputMarks.includes(inputMark)) {
          inputMarks.push(inputMark);
          inputs.push({
            datasourceId: parseInt(inputSchema, 10),
            tableCode: inputTable,
            nodeId: getRandomRowKey(),
          });
        }
        if (!outputMarks.includes(outputMark)) {
          outputMarks.push(outputMark);
          outputs.push({
            datasourceId: parseInt(outputSchema, 10),
            tableCode: outputTable,
            nodeId: getRandomRowKey(),
          });
        }
      });
      if (!inputs.length) {
        inputs.push({ nodeId: getRandomRowKey() });
      }
      if (!outputs.length) {
        outputs.push({ nodeId: getRandomRowKey() });
      }
      this.setState({ inputs, outputs }, () => {
        this.setLinks();
        if (datasourceIds.length) {
          this.getTables(datasourceIds);
        }
      });
    });
  };

  /**
   * 自动带出血缘关系
   */
  getDataByBloodAnalysing = () => {
    const { inputs: inputsVal, outputs: outputsVal } = this.state;
    const { getNoteContent, note } = this.props;
    const scriptContent = getNoteContent();
    const { scriptType, scriptName, tableId, mapperId } = note;
    const datasourceId = parseInt(mapperId, 10);
    const analyse = payload => {
      this.setState({ getRelationLoading: true });
      // 先查一下该数据源的表，用于回显的
      this.getTables([datasourceId]);
      dataBloodAnalyse(payload).then(response => {
        this.setState({ getRelationLoading: false });
        const { resultCode, resultMsg, resultObject } = response;
        if (resultCode === '0') {
          // resultObject是这样的结构的
          /*
           * [{ tableName: '', inputTableName: ['', ''] }]
           * */
          const inputs = [];
          const outputs = [];
          (resultObject || []).forEach(({ tableName, inputTableName = [] }) => {
            if (!outputs.includes(tableName)) {
              outputs.push(tableName);
            }
            (inputTableName || []).forEach(t => {
              if (!inputs.includes(t)) {
                inputs.push(t);
              }
            });
          });
          let _inputs = inputs.map(tableCode => ({
            datasourceId,
            tableCode,
            nodeId: getRandomRowKey(),
          }));
          let _outputs = outputs.map(tableCode => ({
            datasourceId,
            tableCode,
            nodeId: getRandomRowKey(),
          }));
          if (_inputs.length || _outputs.length) {
            this.dirty = true;
          }
          if (!_inputs.length && inputsVal.length) {
            _inputs = inputsVal;
          }
          if (!_outputs.length && outputsVal.length) {
            _outputs = outputsVal;
          }
          this.setState(
            {
              inputs: _inputs,
              outputs: _outputs,
            },
            () => this.setLinks()
          );
        } else if (resultCode == 1) {
          Modal.info({
            content: formatMessage({
              id: 'note.dependency.analyseTips',
              defaultMessage: '解析脚本数据依赖关系失败，请手工设置数据依赖',
            }),
          });
        } else {
          message.error(resultMsg || '');
        }
      });
    };
    if (scriptType === SCRIPT_TYPE_PYTHON || scriptType === SCRIPT_TYPE_SQL) {
      // 只支持python类型和sql类型的脚本
      this.setState({ getRelationLoading: true });
      // 首先，需要查出当前脚本的数据源类型
      getDatasourceByTableId({ tableId }).then(response => {
        this.setState({ getRelationLoading: false });
        defaultHandleResponse(response, (_component = {}) => {
          const component = _component ?? {};
          const { datasourceType = '' } = component;
          const type = datasourceType.toLowerCase(); // 脚本的数据源类型
          let sqlType = '';
          // 只支持hive mysql oracle 3种数据源类型
          const sqlTypesObj = {
            hive: '1',
            mysql: '1',
            oracle: '2',
          };
          Object.keys(sqlTypesObj).forEach(k => {
            if (type.indexOf(k) > -1) {
              sqlType = sqlTypesObj[k];
            }
          });
          if (sqlType || sqlType === '0') {
            analyse({ scriptContent, scriptName, scriptType, sqlType, scriptParams: '' });
          }
        });
      });
    }
  };

  destroyJsPlumb = () => {
    if (this.jsPlumbInstance) {
      this.jsPlumbInstance.deleteEveryConnection();
      this.jsPlumbInstance.deleteEveryEndpoint();
    }
  };

  componentWillUnmount() {
    this.destroyJsPlumb();
  }

  getTables = datasourceIds => {
    const { getTablesLoading } = this.state;
    const _getTablesLoading = { ...getTablesLoading };
    datasourceIds.forEach(id => {
      _getTablesLoading[id] = true;
    });
    this.setState({ getTablesLoading: _getTablesLoading });
    Promise.all(datasourceIds.map(datasourceId => getTableCodeList({ datasourceId }))).then(
      results => {
        const { tablesObj } = this.state;
        const newTablesObj = { ...tablesObj };
        results.forEach((result, index) => {
          defaultHandleResponse(result, (tables = []) => {
            newTablesObj[`${datasourceIds[index]}`] = tables;
          });
        });
        datasourceIds.forEach(id => {
          delete _getTablesLoading[id];
        });
        this.setState({ tablesObj: newTablesObj, getTablesLoading: _getTablesLoading });
      }
    );
  };

  initJsPlumb = () => {
    this.jsPlumbInstance = jsPlumbIn.getInstance({
      ConnectionOverlays: [
        ['Arrow', { location: 0.97, id: 'arrow', length: 6, width: 6, foldback: 0.8 }],
      ],
      ReattachConnections: false,
      ConnectionsDetachable: false,
      PaintStyle: { stroke: '#BFBFBF' },
      Connector: ['Flowchart'],
      Container: document.getElementById(jsplumbContainerId),
    });
  };

  setLinks = () => {
    const links = this.jsPlumbInstance.getAllConnections();
    links.forEach(link => {
      this.jsPlumbInstance.deleteConnection(link);
    });
    const { inputs, outputs } = this.state;
    this.jsPlumbInstance.addEndpoint(document.getElementById(this.middleElemId), {
      endpoint: 'Dot',
      paintStyle,
      connectorStyle,
      anchor: 'Left',
      uuid: this.middleEndPointLeftId,
      maxConnections: -1,
    });
    this.jsPlumbInstance.addEndpoint(document.getElementById(this.middleElemId), {
      endpoint: 'Dot',
      paintStyle,
      connectorStyle,
      anchor: 'Right',
      uuid: this.middleEndPointRightId,
      maxConnections: -1,
    });
    inputs.forEach(item => {
      this.addLink(item, true);
    });
    outputs.forEach(item => {
      this.addLink(item, false);
    });
    this.jsPlumbInstance.setSuspendDrawing(false, true);
  };

  addLink = (item, isLeft, reset) => {
    const { nodeId } = item;
    this.jsPlumbInstance.addEndpoint(document.getElementById(nodeId), {
      endpoint: 'Dot',
      paintStyle: { ...paintStyle, stroke: '#13C2C2' },
      connectorStyle,
      anchor: isLeft ? 'Right' : 'Left',
      uuid: nodeId,
      maxConnections: -1,
    });
    if (isLeft) {
      this.jsPlumbInstance.connect({
        uuids: [nodeId, this.middleEndPointLeftId],
      });
    } else {
      this.jsPlumbInstance.connect({
        uuids: [this.middleEndPointRightId, nodeId],
      });
    }
    if (reset) {
      this.jsPlumbInstance.setSuspendDrawing(false, true);
    }
  };

  handleAddDependency = isInput => {
    const { inputs, outputs } = this.state;
    const data = isInput ? [...inputs] : [...outputs];
    const newItem = { nodeId: getRandomRowKey() };
    data.push(newItem);
    this.setState({ [isInput ? 'inputs' : 'outputs']: data }, () => {
      this.addLink(newItem, isInput, true);
    });
    this.dirty = true;
  };

  handleRemoveDependency = (nodeId, isInput) => {
    const { inputs, outputs } = this.state;
    const data = isInput ? [...inputs] : [...outputs];
    const index = data.findIndex(o => o.nodeId === nodeId);
    data.splice(index, 1);
    this.dirty = true;
    this.setState({ [isInput ? 'inputs' : 'outputs']: data }, () => {
      this.jsPlumbInstance.remove(nodeId);
      this.jsPlumbInstance.setSuspendDrawing(false, true);
      if (!data.length) {
        this.handleAddDependency(isInput);
      }
    });
  };

  handleChangeSelectionObj = (value, nodeId, isInput, key) => {
    const { inputs, outputs, tablesObj } = this.state;
    const data = isInput ? [...inputs] : [...outputs];
    const index = data.findIndex(o => o.nodeId === nodeId);
    const newItem = { ...data[index] };
    if (key === 'datasourceId') {
      delete newItem.tableCode;
      const tables = tablesObj[`${value}`] || [];
      if (!tables.length) {
        this.getTables([value]);
      }
    } else {
      const { datasourceId } = newItem;
      const marks = data.map(o => `${o.datasourceId}.${o.tableCode}`);
      if (marks.includes(`${datasourceId}.${value}`)) {
        message.warning(
          formatMessage({
            id: 'note.dependency.selectRepeatedTableWarning',
            defaultMessage: '不可重复选择同一张表',
          })
        );
        return false;
      }
    }
    this.dirty = true;
    data.splice(index, 1, { ...newItem, [key]: value });
    this.setState({ [isInput ? 'inputs' : 'outputs']: data });
  };

  getRowContent = isInput => {
    const { inputs, outputs, getTablesLoading } = this.state;
    const data = isInput ? inputs : outputs;
    const { datasourceTreeData } = this.props;
    return (
      <div className={styles.inOutputColumn}>
        <div className={styles.addDependencyIcon} onClick={() => this.handleAddDependency(isInput)}>
          <MyIcon
            type="iconplus"
            title={
              isInput
                ? formatMessage({ id: 'note.dependency.input.add', defaultMessage: '添加输入依赖' })
                : formatMessage({
                    id: 'note.dependency.output.add',
                    defaultMessage: '添加输出依赖',
                  })
            }
          />
        </div>
        {data.map((o, index) => {
          let DataSourceItemTitle = '';
          try {
            const { datasourceName = '', datasourceLabel = '' } =
              findTreeNodeInTreeData(o.datasourceId, datasourceTreeData, 'key') || {};
            DataSourceItemTitle = datasourceName ? `${datasourceLabel}(${datasourceName})` : '';
          } catch (error) {
            console.log(error);
          }
          return (
            <div
              className={classnames(styles.selectionRow, index > 0 ? styles.notFirstRow : '')}
              id={o.nodeId}
              key={o.nodeId}
            >
              <Tooltip title={DataSourceItemTitle}>
                <div>
                  <DataSourceSelect
                    datasourceTreeData={datasourceTreeData}
                    onChange={targetOption => {
                      const { datasourceId } = targetOption;
                      this.handleChangeSelectionObj(
                        datasourceId,
                        o.nodeId,
                        isInput,
                        'datasourceId'
                      );
                    }}
                    datasourceId={o.datasourceId}
                    showLabel={false}
                    placement={isInput ? 'bottomLeft' : 'bottom'}
                    className={`${styles.DataSourceSelect} ${styles.widthBox}`}
                  />
                </div>
              </Tooltip>
              <span className={styles.division}>.</span>
              <Tooltip title={o.tableCode}>
                <div>
                  <TableSelect
                    classNames={styles.widthBox}
                    rowKey="tableId"
                    placeholder={formatMessage({ id: 'project.table', defaultMessage: '表' })}
                    onChange={tableCode =>
                      this.handleChangeSelectionObj(tableCode, o.nodeId, isInput, 'tableCode')
                    }
                    searchLabel="keyword"
                    value={o.tableCode}
                    searchParams={{ datasourceId: o.datasourceId }}
                    editable={false}
                    disabled={getTablesLoading[o.datasourceId]}
                    width={500}
                    dom={this.modalRef}
                  />
                </div>
              </Tooltip>
              <Popconfirm
                title={formatMessage({
                  id: 'project.confirmDeletion',
                  defaultMessage: '确认删除?',
                })}
                onConfirm={() => this.handleRemoveDependency(o.nodeId, isInput)}
              >
                <MyIcon className={styles.removeIcon} type="icondelete" />
              </Popconfirm>
            </div>
          );
        })}
      </div>
    );
  };

  checkIsDirty = () => this.dirty;

  setDirty = () => {
    this.dirty = true;
  };

  getSubmitPromise = callback => {
    const { inputs, outputs } = this.state;
    const {
      note: { scriptId },
      tabKey,
      dispatch,
    } = this.props;
    const relationList = [];
    const { list } = this.TaskDepend.state;

    const _inputs = inputs.filter(i => !!i.tableCode);
    const _outputs = outputs.filter(i => !!i.tableCode);

    const dataDependFlag = _inputs.length > 0 && _outputs.length > 0;
    const taskDependFlag = list.length > 0;
    if (!(dataDependFlag || taskDependFlag)) {
      message.error(
        formatMessage({
          id: 'note.config.dependTip',
          defaultMessage: '数据依赖和任务依赖必须配置一个，不能同时为空',
        })
      );
      callback(true, null);
      return false;
    }

    const hasEditRow = list.some(i => i.isEdit);
    if (hasEditRow) {
      callback(true, null);

      return false;
    }

    /*
       保存的时候全量保存，inputs和outputs叉乘组合
       比如说当前左侧有两条数据，inputSchema1.inputTable1和inputSchema2.inputTable2
       而右侧只有一条数据：outputSchema1.outputTable1
       这时候保存的数据就变成了2条：[{inputSchema1, inputTable1, outputSchema1, outputTable1}, {inputSchema2, inputTable2, outputSchema1, outputTable1}]
       如果说右侧也有两条数据，那么总共就有4条
    */
    inputs.forEach(input => {
      const { datasourceId: inputSchema, tableCode: inputTable } = input;
      outputs.forEach(output => {
        const { datasourceId: outputSchema, tableCode: outputTable } = output;
        relationList.push({ inputSchema, inputTable, outputSchema, outputTable });
      });
    });

    const promise = () =>
      new Promise(resolve => {
        Promise.all([
          saveDependencyRelation({ taskId: scriptId, relationList }),
          dispatch({
            type: 'note/saveTaskRelationList',
            payload: {
              scriptId,
              relationList: list.map(i => {
                return {
                  relTaskId: i.relTaskId,
                  refExp: i.refExp,
                };
              }),
            },
          }),
        ]).then(resList => {
          const [response, { isSuccess: isSuccess2 }] = resList;
          const { isSuccess: isSuccess1 } = hocResponse(response);
          if (isSuccess1 && isSuccess2) {
            this.getData();
            this.dirty = false;
            resolve(true);
          } else {
            resolve(tabKey);
          }
        });
      });
    callback(null, promise);
  };

  render() {
    const { getRelationLoading } = this.state;
    const {
      note: { scriptName },
      note,
    } = this.props;

    return (
      <div
        className="fullHeight"
        ref={v => {
          this.taskData = v;
        }}
      >
        <ClosableTip
          className={styles.marginTip}
          tip={formatMessage({
            id: 'note.dependency.tip',
            defaultMessage: '设置脚本依赖的输入数据表和输出数据表。',
          })}
        />

        <Spin spinning={getRelationLoading}>
          <div className={styles.header}>
            <span className={styles.borderLeftHeader}>
              {formatMessage({ id: 'dd.TaskConfig.DataDependence', defaultMessage: '数据依赖' })}
            </span>
          </div>

          <div id={jsplumbContainerId} className={styles.dependencyJsPlumbCon}>
            {this.getRowContent(true)}
            <div className={styles.middleItem}>
              <div id={this.middleElemId}>
                <Tooltip
                  title={`${scriptName}${formatMessage({
                    id: 'note.dependency.taskName',
                    defaultMessage: '任务',
                  })}`}
                >
                  <span>
                    {`${scriptName}${formatMessage({
                      id: 'note.dependency.taskName',
                      defaultMessage: '任务',
                    })}`}
                  </span>
                </Tooltip>
              </div>
            </div>
            {this.getRowContent(false)}
          </div>
          <div className={styles.TaskDepend}>
            <TaskDepend
              setDirty={this.setDirty}
              note={note}
              Refs={v => {
                this.TaskDepend = v;
              }}
            />
          </div>
        </Spin>
      </div>
    );
  }
}

export default TaskDataDependency;
