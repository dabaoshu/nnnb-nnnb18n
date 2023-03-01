import React, { Component } from 'react';
import { connect } from 'dva';
import { Tabs, Spin, message, Button } from 'antd';
import { formatMessage } from 'umi/locale';
import ModalDrawer from '@/bdpcloud/components/ModalDrawer';
import BaseInfo from './component/BaseInfo';
import BusinessInfo from './component/BusinessInfo';
import { saveFields } from './component/BaseInfo/utils';
import { GBASE_HASH_TAB } from './dataSorce/gbaseComponent/utils';
import { renderTypeList, getPickColumn } from './dataSorce';
import lefterTabsBar from '@/bdpcloud/pages/styles/lefterTabsBar.less';
import styles from './index.less';
import lodash from 'lodash';
import Empty from '@/bdpcloud/components/Empty';
import {
  ADD_BUTTON_COMMON_NEW,
  ADD_BUTTON_SQL_NEW,
  ADD_BUTTON_SQL_COMMON,
  getBaseInfoInitData,
} from './utils';
import classnames from 'classnames';
import { clearRowID } from '@dc/modelManage/dataSorce/utils';

import ModelBlood from './ModelBlood';
import { getModelTitle } from './utils2';
import CheckResultModal from '@/pages/dc/modelManage/component/ResultModal';
import { ResultContent } from '../components/ResultModal';

const MODEL_DETAIL = 'modelDetail';
const MODEL_BLOOD = 'modelBlood';

@connect(({ loading, modelEditor }) => ({
  NewModelsData: modelEditor.NewModelsData,
  NoKeyModels: modelEditor.NoKeyModels,
  datasourceType: modelEditor.datasourceType,
  loading:
    loading.effects['modelEditor/getDataSource'] ||
    loading.effects['modelEditor/getViewCatalogueTree'] ||
    loading.effects['modelEditor/getDatasourceTypes'],
  sqlLoading:
    loading.effects['modelEditor/hiveParserSql'] ||
    loading.effects['modelEditor/databaseParserSql'],
  standardLoading:
    loading.effects['modelEditor/saveOrUpdateDbModel'] ||
    loading.effects['modelEditor/saveEsModel'] ||
    loading.effects['modelEditor/updateEsModel'] ||
    loading.effects['modelEditor/saveHiveModel'] ||
    loading.effects['modelEditor/updateHiveModel'] ||
    loading.effects['modelEditor/saveGpModel'] ||
    loading.effects['modelEditor/updateGpModel'] ||
    loading.effects['modelEditor/saveGBaseModel'] ||
    loading.effects['modelEditor/updateGBaseModel'] ||
    loading.effects['modelEditor/saveCacheModel'] ||
    loading.effects['modelEditor/updateCacheModel'],
  DirectoryTreeData: modelEditor.DirectoryTreeData,
  datasourceTypeList: modelEditor.datasourceTypeList,
}))
class ModelStandard extends Component {
  static defaultProps = {
    editType: ADD_BUTTON_COMMON_NEW,
    activeTabTopKey: MODEL_DETAIL,
    canOperate: true,
  };

  constructor(props) {
    super(props);
    // editType 判断是否为普通 新增 和sql 新增

    const { editType, currentNode = {}, isDirectory = false } = props;
    const { datasourceId, datasourceType, datasourceName } = currentNode;
    let initTabData = {};
    if (!isDirectory) {
      initTabData = {
        schemaCode: datasourceName, // 数据源视图字段是datasourceName
        tableType: datasourceType,
        schemaId: datasourceId,
      };
    } else {
      initTabData = getBaseInfoInitData(currentNode);
    }

    const { gbaseTableType } = currentNode;
    const showHashTab = gbaseTableType != '0'; // 表类型为复制表没有tab hash分布列
    this.state = {
      activeTabKey: 'metaDataInfo',
      editType,
      currentNodeInitData: initTabData,
      BaseInfoLoading: false, // 控制BaseInfo 重新渲染一次
      baseInfoRefresh: false, // 是否二次刷新状态
      currentNode,
      // 其它系统通过iframe嵌入该页面显示详情，调用示例见文件底部
      iframe: props.iframe || false,
      showHashTab, // gbase特有的
      checkResult: {
        // 规则结果
        passNum: 0,
        noPassNum: 0,
        checkResultList: [],
      },
      showCheckRuleTip: false, // 提示框
    };
    this.ComponentList = [];
    this.ComponentListRefs = {};
  }

  componentDidMount() {
    // 数据目录
    this.getDataDirectory();
    // 数据源目录
    this.getDataSource();
    // 判断是否落地
    this.queryAttach();
    const { currentRecord, dispatch, standardMode } = this.props;
    const newCurrentRecord = {};
    const keys = Object.keys(currentRecord);
    const { columnList = [] } = currentRecord;

    const fieldList = columnList.map(item => {
      return { ...item, name: item.columnCode, value: item.columnCode };
    });
    keys.forEach(key => {
      if (lodash.isArray(currentRecord[key]) || lodash.isObject(currentRecord[key])) {
        newCurrentRecord[key] = currentRecord[key];
      }
    });

    dispatch({
      type: 'modelEditor/save',
      payload: {
        NewModelsData: currentRecord,
        NoKeyModels: newCurrentRecord,
        currentRecord,
        fieldList,
        disabled: standardMode === 'view',
        standardMode,
      },
    });
  }

  queryAttach = () => {
    const { dispatch, currentRecord, standardMode } = this.props;
    // 编辑才有
    if (standardMode !== 'edit') {
      return;
    }
    dispatch({
      type: 'modelEditor/isTableExist',
      payload: {
        metaDataId: currentRecord.metaDataId,
      },
    }).then(isTableExist => {
      if (isTableExist) {
        dispatch({
          type: 'modelEditor/save',
          payload: {
            Attach: isTableExist,
          },
        });
      }
    });
  };

  getDataDirectory = () => {
    const { dispatch } = this.props;
    dispatch({
      type: 'modelEditor/getViewCatalogueTree',
      payload: {
        isNative: 'N',
      },
    });
  };

  getDataSource = async () => {
    const { dispatch } = this.props;
    await dispatch({
      type: 'modelEditor/getDatasourceTypes',
      payload: {
        standType: 'MODEL_DS_TYPE',
      },
    });
  };

  componentWillUnmount() {
    const { dispatch } = this.props;
    dispatch({
      type: 'modelEditor/clearState',
    });
  }

  onCancel = () => {
    const { onCancel } = this.props;
    if (onCancel) {
      onCancel();
    }
  };

  renderTypeList = (datasourceType, T = false) => {
    const { activeTabKey, showHashTab } = this.state;
    let ComponentList = renderTypeList(datasourceType);
    if (datasourceType === 'gbase') {
      if (!showHashTab) {
        ComponentList = ComponentList.filter(item => item.key !== GBASE_HASH_TAB);
      }
    }
    if (T) {
      return ComponentList.map(item => {
        return {
          key: item.key,
        };
      });
    }
    return ComponentList.map(item => {
      return (
        <Tabs.TabPane key={item.key} tab={item.tab}>
          {activeTabKey == item.key && (
            <item.Component
              Refs={v => {
                this.ComponentListRefs[item.key] = v;
              }}
            />
          )}
        </Tabs.TabPane>
      );
    });
  };

  TabsChange = async key => {
    this.setState({ activeTabKey: key });
  };

  ValidateColumnList = async () => {
    const { standardMode } = this.props;

    if (standardMode === 'view') {
      return true;
    }
    const { columnList: columnListRef } = this.ComponentListRefs;
    let canNext = false;
    if (!columnListRef) {
      return true;
    }
    try {
      canNext = await columnListRef.ModalForm.Validate();
    } catch (error) {
      message.warn(
        formatMessage({
          id: 'dc.datasource.completeFieldInformation',
          defaultMessage: '请完善字段信息',
        })
      );
    }
    return canNext;
  };

  SaveColumnList = () => {
    const { columnList: columnListRef } = this.ComponentListRefs;
    columnListRef.ModalForm.save();
  };

  GetColumnList = () => {
    const { columnList: columnListRef } = this.ComponentListRefs;
    return columnListRef.ModalForm.data;
  };

  baseInfoPathCodeChange = currentNode => {
    const { dispatch } = this.props;
    this.setState({
      BaseInfoLoading: true,
    });
    const currentNodeInitData = getBaseInfoInitData(currentNode);
    dispatch({
      type: 'modelEditor/save',
      payload: { LogicItem: {}, fieldList: [], NewModelsData: {}, NoKeyModels: {} },
    });
    setTimeout(() => {
      this.setState({
        BaseInfoLoading: false,
        currentNodeInitData,
        baseInfoRefresh: true,
        currentNode,
      });
    }, 100);
  };

  refresh = () => {
    this.setState({
      BaseInfoLoading: true,
    });

    setTimeout(() => {
      this.setState({
        BaseInfoLoading: false,
      });
    }, 100);
  };

  //   sql 新增
  SqlNext = async () => {
    const Data = await this.BaseInfo.Validate();
    const { currentNodeInitData } = this.state;
    if (Data) {
      const { dispatch } = this.props;
      const { tableType, sqlScript } = Data;

      if (!sqlScript) {
        message.error(
          formatMessage({ id: 'dc.metadata.inputSqlWarning', defaultMessage: '请填写sql内容' })
        );
        return;
      }
      let type = '';
      const tableTypeList = ['mysql', 'oracle', 'gp', 'postgreSql', 'clickhouse'];
      if (tableTypeList.includes(tableType)) {
        type = 'modelEditor/databaseParserSql';
      }
      if (tableType == 'hive') {
        type = 'modelEditor/hiveParserSql';
      } else if (tableType === 'gbase') {
        type = 'modelEditor/gbaseParserSql';
      }
      delete Data.sqlScript;
      dispatch({
        type,
        payload: {
          dbType: tableType,
          sqlScript,
        },
        callback: (resultObject = {}) => {
          const metaDataInfo = { ...Data };
          const { domainId, layerId } = currentNodeInitData;

          const newCurrentRecord = { metaDataInfo };
          let fieldList = [];
          if (lodash.isObject(resultObject)) {
            const keys = Object.keys(resultObject);
            keys.forEach(key => {
              if (lodash.isArray(resultObject[key]) || lodash.isObject(resultObject[key])) {
                newCurrentRecord[key] = resultObject[key];
              } else {
                metaDataInfo[key] = resultObject[key];
                if (key == 'metaDataDesc' && !resultObject.metaDataName) {
                  metaDataInfo.metaDataName = resultObject[key] || resultObject.metaDataCode;
                }
              }
            });

            metaDataInfo.domainId = metaDataInfo.domainId
              ? metaDataInfo.domainId
              : Data.domainId
              ? Data.domainId
              : domainId;
            metaDataInfo.layerId = metaDataInfo.layerId
              ? metaDataInfo.layerId
              : Data.layerId
              ? Data.layerId
              : layerId;

            newCurrentRecord.metaDataInfo = { ...newCurrentRecord.metaDataInfo, ...metaDataInfo };
            const { columnList = [] } = resultObject;
            fieldList = columnList.map(item => {
              return { ...item, name: item.columnCode, value: item.columnCode };
            });
          }
          dispatch({
            type: 'modelEditor/save',
            payload: {
              NewModelsData: newCurrentRecord,
              NoKeyModels: newCurrentRecord,
              fieldList,
            },
          });

          this.setState({
            editType: ADD_BUTTON_SQL_COMMON,
          });
        },
      });
    }
  };

  // 下一步
  handleNextStep = async step => {
    let canNext = true;
    const { NoKeyModels, datasourceType } = this.props;
    const { constraintList = [] } = NoKeyModels;
    const activeTabKey = this.ComponentList[step + 1].key;
    let Data = {};
    if (step === 0) {
      Data = await this.BaseInfo.Validate();
      console.log('Data', Data);
      if (!Data) {
        return;
      }
      const { dispatch, NewModelsData } = this.props;
      const { metaDataInfo } = NewModelsData;
      dispatch({
        type: 'modelEditor/saveNewModelsData',
        payload: {
          metaDataInfo: { ...metaDataInfo, ...Data },
        },
      });
    }
    if (step === 1 && datasourceType != 'clickhouse') {
      canNext = await this.ValidateColumnList();
    }
    if (step === 1 && datasourceType == 'clickhouse') {
      const { columnList: columnListRef } = this.ComponentListRefs;
      canNext = await this.ValidateColumnList();
      let msg = false;
      if (columnListRef.ModalForm.data && columnListRef.ModalForm.data.length > 0) {
        columnListRef.ModalForm.data.forEach(item => {
          if (item.columnType.indexOf('Decimal') > -1) {
            if (!item.columnAccuracy) {
              msg = true;
              canNext = false;
            }
          }
        });
      }
      if (msg) {
        message.warning(
          formatMessage({
            id: '字段类型为Decimal时，精度必填',
            defaultMessage: '字段类型为Decimal时，精度必填',
          })
        );
      }
    }
    if (
      step === 2 &&
      (!constraintList || constraintList.length == 0) &&
      datasourceType == 'clickhouse'
    ) {
      message.warning(
        formatMessage({
          id: '排序字段必填',
          defaultMessage: '排序字段必填',
        })
      );
      canNext = false;
    }

    if (canNext) {
      this.TabsChange(activeTabKey);
    }
  };

  handlePreStep = async step => {
    const activeTabKey = this.ComponentList[step - 1].key;
    if (step === 1) {
      this.SaveColumnList();
    }
    if (step === this.ComponentList.length - 1) {
      this.BusinessInfo.saveData();
    }
    this.TabsChange(activeTabKey);
  };

  handleSubmit = async () => {
    const { standardMode } = this.props;
    const { activeTabKey } = this.state;
    if (standardMode === 'view') {
      this.onCancel();
      return;
    }
    if (activeTabKey === 'columnList') {
      // 第二步直接保存数据未保存models
      const step1 = await this.ValidateColumnList();
      if (!step1) {
        return false;
      }
    }

    let canSubmit = await this.BusinessInfo.Validate();
    if (!canSubmit) {
      return;
    }
    canSubmit = await this.handleSubmitBeforeCheck();
    if (!canSubmit) {
      return;
    }
    this._handleSubmit();
  };

  _handleSubmit = () => {
    const { datasourceType, NoKeyModels } = this.props;
    const { activeTabKey } = this.state;
    const { metaDataInfo: oldMetaDataInfo } = NoKeyModels;
    let { columnList: oldColumnList } = NoKeyModels;
    if (activeTabKey === 'columnList') {
      const data = JSON.parse(JSON.stringify(this.GetColumnList()));
      oldColumnList = clearRowID([...data]);
    }
    const metaDataInfo = {};
    saveFields.forEach(key => {
      if (typeof oldMetaDataInfo[key] !== 'undefined') {
        metaDataInfo[key] = oldMetaDataInfo[key];
      }
    });
    let addType = false;
    if (!metaDataInfo.metaDataId) {
      metaDataInfo.objectType = 'table';
      addType = true;
    }
    const pickColumn = getPickColumn(datasourceType);
    const columnList = oldColumnList.map(item => {
      const NewItem = lodash.pick(item, pickColumn.map(o => o.id));
      return NewItem;
    });
    switch (datasourceType) {
      case 'mysql':
      case 'udal':
      case 'goldendb':
      case 'oracle':
        this.mysqlAdd({ metaDataInfo, columnList }, addType);
        break;
      case 'es':
        this.esAdd({ metaDataInfo, columnList }, addType);
        break;
      case 'hive':
        this.hiveAdd({ metaDataInfo, columnList }, addType);
        break;
      case 'gp':
      case 'postgreSql':
        this.gpAdd({ metaDataInfo, columnList }, addType);
        break;
      case 'hbase':
        this.hbaseAdd({ metaDataInfo, columnList }, addType);
        break;
      case 'gbase':
        this.gbaseAdd({ metaDataInfo, columnList }, addType);
        break;
      case 'clickhouse':
        this.clickHouseAdd({ metaDataInfo, columnList }, addType);
        break;

      default:
        break;
    }
  };

  handleSubmitBeforeCheck = async () => {
    const { dispatch } = this.props;
    const { metaDataInfo, columnList, partitionList } = this.queryModels();
    const { isSuccess, data } = await dispatch({
      type: 'modelEditor/checkModel',
      payload: { metaDataInfo, columnList, partitionList },
    });

    if (isSuccess) {
      const { passNum, noPassNum, checkResultList: _list } = data;
      if (noPassNum > 0) {
        this.setState({
          showCheckRuleTip: true,
          checkResult: {
            passNum,
            noPassNum,
            checkResultList: _list,
          },
        });
        return false;
      }
      return true;
    }

    return true;
  };

  queryModels = () => {
    const { datasourceType, NoKeyModels } = this.props;
    const { activeTabKey } = this.state;
    let { columnList: oldColumnList } = NoKeyModels;
    const { metaDataInfo: oldMetaDataInfo, partitionList = [] } = NoKeyModels;
    console.log('oldMetaDataInfo', oldMetaDataInfo);
    if (activeTabKey === 'columnList') {
      // 第二步直接保存数据未保存models
      const data = JSON.parse(JSON.stringify(this.GetColumnList()));
      oldColumnList = clearRowID([...data]);
    }
    // 过滤数据
    const metaDataInfo = saveFields.reduce((info, item) => {
      if (oldMetaDataInfo[item]) {
        info[item] = oldMetaDataInfo[item];
      }
      return info;
    }, {});
    console.log('metaDataInfo', metaDataInfo);
    const pickColumn = getPickColumn(datasourceType);
    let columnList = oldColumnList?.map(item => {
      const NewItem = lodash.pick(item, pickColumn.map(o => o.id));
      return NewItem;
    });

    if (datasourceType === 'es') {
      columnList = columnList.map(o => {
        if (o.columnType) {
          o.columnType = o.columnType?.toLowerCase();
        }
        return o;
      });
    }

    let isNew = false;
    if (!metaDataInfo.metaDataId) {
      metaDataInfo.objectType = 'table';
      isNew = true;
    }
    return {
      metaDataInfo,
      columnList,
      partitionList,
      isNew,
    };
  };

  computeId = (arr = [], newArr = [], id = 'columnId') => {
    const addorUp = [];
    const newArrids = [];
    newArr.forEach(item => {
      if (item[id]) {
        newArrids.push(item[id]);
        const targrtItem = arr.filter(ele => ele[id] == item[id])[0];
        if (!lodash.isEqual(targrtItem, item)) {
          addorUp.push(item);
        }
      } else {
        addorUp.push(item);
      }
    });
    const deleteIds = arr
      .filter(item => !newArrids.includes(item[id]))
      .map(item => String(item[id]));

    return [addorUp, deleteIds];
  };

  mysqlAdd = ({ metaDataInfo, columnList: newColumnList }, isNew) => {
    const { dispatch, currentRecord, NoKeyModels } = this.props;
    const {
      indexList: newIndexInfoList,
      constraintList: newConstraintInfoList,
      bussinessAttr,
    } = NoKeyModels;

    let payload = {};
    if (isNew) {
      payload = {
        projectId: -1,
        isNew: true,
        ...NoKeyModels,
        columnList: newColumnList,
        interRequestSource: 'dc',
      };
    } else {
      const {
        columnList,
        indexList: indexInfoList,
        constraintList: constraintInfoList,
      } = currentRecord;
      const [addedOrUpdatedFields, deletedFieldIds] = this.computeId(
        columnList,
        newColumnList,
        'columnId'
      );
      const [addedOrUpdatedIndexs, deletedIndexIds] = this.computeId(
        indexInfoList,
        newIndexInfoList,
        'indexId'
      );
      const [addedOrUpdatedConstraints, deletedConstraintIds] = this.computeId(
        constraintInfoList,
        newConstraintInfoList,
        'constraintId'
      );

      payload = {
        metaDataInfo,
        addedOrUpdatedFields,
        deletedFieldIds,
        addedOrUpdatedIndexs,
        deletedIndexIds,
        addedOrUpdatedConstraints,
        deletedConstraintIds,
        bussinessAttr,
        interRequestSource: 'dc',
      };
    }
    dispatch({
      type: 'modelEditor/saveOrUpdateDbModel',
      payload,
      callback: () => {
        message.success(
          formatMessage({
            id: 'COMMON_COMMAND_SUCCESS',
            defaultMessage: '操作成功',
          })
        );
        const { handleSuccess } = this.props;
        if (handleSuccess) {
          handleSuccess();
        }
      },
    });
  };

  esAdd = ({ metaDataInfo, columnList }, addType) => {
    columnList = columnList.map(o => {
      if (o.columnType) {
        o.columnType = o.columnType?.toLowerCase();
      }
      return o;
    });
    const { NoKeyModels, dispatch } = this.props;
    let type = 'modelEditor/saveEsModel';
    if (!addType) {
      type = 'modelEditor/updateEsModel';
    }
    dispatch({
      type,
      payload: {
        projectId: -1,
        ...NoKeyModels,
        metaDataInfo,
        columnList,
        interRequestSource: 'dc',
      },
      callback: () => {
        message.success(
          formatMessage({
            id: 'COMMON_COMMAND_SUCCESS',
            defaultMessage: '操作成功',
          })
        );
        const { handleSuccess } = this.props;
        if (handleSuccess) {
          handleSuccess();
        }
      },
    });
  };

  hiveAdd = ({ metaDataInfo, columnList }, addType) => {
    const { NoKeyModels, dispatch } = this.props;
    // const {
    //   metaDataInfo: { periodId },
    // } = NoKeyModels;
    // let periodType;
    // const { Cycle } = this.BaseInfo.state;
    /* if (periodId) {
      Cycle.forEach(item => {
        if (item.periodId == periodId) {
          // eslint-disable-next-line prefer-destructuring
          periodType = item.periodType;
        }
      });
    } */
    /* if (period && !periodId) {
      message.warning(
        formatMessage({
          id: 'dc.metadata.dataAccountTips',
          defaultMessage: '你已设置了业务时间字段属性，需要设置数据周期属性【基本信息-数据周期】',
        })
      );
      return;
    }
    if (!period && periodId && periodType != 0 && periodType != 7) {
      message.warning(
        formatMessage({
          id: 'dc.metadata.dataCycleTips',
          defaultMessage:
            '你已设置了数据周期属性，需要设置业务时间字段属性【业务属性-业务时间字段】',
        })
      );
      return;
    } */

    let type = 'modelEditor/saveHiveModel';
    if (!addType) {
      type = 'modelEditor/updateHiveModel';
    }
    dispatch({
      type,
      payload: {
        projectId: -1,
        ...NoKeyModels,
        metaDataInfo,
        columnList,
        interRequestSource: 'dc',
      },
      callback: () => {
        message.success(
          formatMessage({
            id: 'COMMON_COMMAND_SUCCESS',
            defaultMessage: '操作成功',
          })
        );
        const { handleSuccess } = this.props;
        if (handleSuccess) {
          handleSuccess();
        }
      },
    });
  };

  gpAdd = ({ metaDataInfo, columnList }, addType) => {
    const { NoKeyModels, dispatch } = this.props;
    let type = 'modelEditor/saveGpModel';
    if (!addType) {
      type = 'modelEditor/updateGpModel';
    }
    dispatch({
      type,
      payload: {
        projectId: -1,
        ...NoKeyModels,
        metaDataInfo,
        columnList,
        interRequestSource: 'dc',
      },
      callback: () => {
        message.success(
          formatMessage({
            id: 'COMMON_COMMAND_SUCCESS',
            defaultMessage: '操作成功',
          })
        );
        const { handleSuccess } = this.props;
        if (handleSuccess) {
          handleSuccess();
        }
      },
    });
  };

  hbaseAdd = ({ metaDataInfo, columnList }, addType) => {
    const { NoKeyModels, dispatch } = this.props;
    let type = 'modelEditor/saveHbaseModel';
    if (!addType) {
      type = 'modelEditor/updateHbaseModel';
    }
    dispatch({
      type,
      payload: {
        projectId: -1,
        ...NoKeyModels,
        metaDataInfo,
        columnList,
        interRequestSource: 'dc',
      },
      callback: () => {
        message.success(
          formatMessage({
            id: 'COMMON_COMMAND_SUCCESS',
            defaultMessage: '操作成功',
          })
        );
        const { handleSuccess } = this.props;
        if (handleSuccess) {
          handleSuccess();
        }
      },
    });
  };

  clickHouseAdd = async ({ metaDataInfo, columnList: newColumnList }, isNew) => {
    const { dispatch, currentRecord, NoKeyModels } = this.props;
    const {
      indexList: newIndexInfoList,
      constraintList: newConstraintInfoList,
      bussinessAttr,
      partitionList = [],
    } = NoKeyModels;

    let payload = {};
    if (isNew) {
      payload = {
        projectId: -1,
        isNew: true,
        ...NoKeyModels,
        columnList: newColumnList,
        interRequestSource: 'dc',
      };
    } else {
      const {
        columnList,
        indexList: indexInfoList,
        constraintList: constraintInfoList,
      } = currentRecord;
      const [addedOrUpdatedFields, deletedFieldIds] = this.computeId(
        columnList,
        newColumnList,
        'columnId'
      );
      const [addedOrUpdatedIndexs, deletedIndexIds] = this.computeId(
        indexInfoList,
        newIndexInfoList,
        'indexId'
      );
      const [addedOrUpdatedConstraints, deletedConstraintIds] = this.computeId(
        constraintInfoList,
        newConstraintInfoList,
        'constraintId'
      );

      payload = {
        metaDataInfo,
        addedOrUpdatedFields,
        deletedFieldIds,
        addedOrUpdatedIndexs,
        deletedIndexIds,
        addedOrUpdatedConstraints,
        deletedConstraintIds,
        bussinessAttr,
        partitionList,
        interRequestSource: 'dc',
      };
    }
    dispatch({
      type: 'modelEditor/saveOrUpdateDbModel',
      payload,
      callback: () => {
        message.success(
          formatMessage({
            id: 'COMMON_COMMAND_SUCCESS',
            defaultMessage: '操作成功',
          })
        );
        const { handleSuccess } = this.props;
        if (handleSuccess) {
          handleSuccess();
        }
      },
    });
  };

  gbaseAdd = ({ metaDataInfo, columnList }, addType) => {
    const { NoKeyModels, dispatch } = this.props;
    let type = 'modelEditor/saveGBaseModel';
    if (!addType) {
      type = 'modelEditor/updateGBaseModel';
    }
    dispatch({
      type,
      payload: {
        projectId: -1,
        ...NoKeyModels,
        metaDataInfo,
        columnList,
        interRequestSource: 'dc',
      },
      callback: () => {
        message.success(
          formatMessage({
            id: 'COMMON_COMMAND_SUCCESS',
            defaultMessage: '操作成功',
          })
        );
        const { handleSuccess } = this.props;
        if (handleSuccess) {
          handleSuccess();
        }
      },
    });
  };

  switchChang = async key => {
    const { dispatch, NewModelsData, standardMode } = this.props;
    const { activeTabKey } = this.state;
    if (standardMode === 'view') {
      this.TabsChange(key);
    }
    const { metaDataInfo } = NewModelsData;
    let Data = {};

    if (activeTabKey == 'metaDataInfo') {
      Data = await this.BaseInfo.Validate();
      if (!Data) return false;
      dispatch({
        type: 'modelEditor/saveNewModelsData',
        payload: {
          metaDataInfo: { ...metaDataInfo, ...Data },
        },
      });
    }

    if (activeTabKey == 'columnList') {
      if (key !== 'metaDataInfo') {
        const step1 = await this.ValidateColumnList();
        if (!step1) {
          return false;
        }
      } else {
        this.SaveColumnList();
      }
    }

    this.TabsChange(key);
  };

  setShowHashTab = showHashTab => {
    this.setState({
      showHashTab,
    });
  };

  getBaseInfoRef = ref => {
    this.BaseInfo = ref;
  };

  containRender = () => {
    const { loading = false, datasourceType, isDirectory } = this.props;

    const {
      activeTabKey,
      editType,
      currentNodeInitData,
      BaseInfoLoading,
      baseInfoRefresh,
      currentNode,
    } = this.state;

    if (editType === ADD_BUTTON_SQL_NEW) {
      return (
        <BaseInfo
          currentNode={currentNode}
          editType={editType}
          currentNodeInitData={currentNodeInitData}
          isDirectory={isDirectory}
          Ref={v => {
            this.BaseInfo = v;
          }}
        />
      );
    }

    return (
      <Spin spinning={loading || BaseInfoLoading} wrapperClassName="full-height-spin">
        <Tabs
          type="card"
          tabPosition="left"
          activeKey={activeTabKey}
          tabBarGutter={0}
          className={classnames(lefterTabsBar.tabs, styles.tabItem)}
          onChange={this.switchChang}
        >
          <Tabs.TabPane
            key="metaDataInfo"
            tab={formatMessage({ id: 'dc.projectConfig.basicInfo', defaultMessage: '基本信息' })}
          >
            {!BaseInfoLoading && (
              <BaseInfo
                baseInfoRefresh={baseInfoRefresh}
                currentNode={currentNode}
                editType={editType}
                currentNodeInitData={currentNodeInitData}
                baseInfoPathCodeChange={this.baseInfoPathCodeChange}
                isDirectory={isDirectory}
                Ref={this.getBaseInfoRef}
                setShowHashTab={this.setShowHashTab}
              />
            )}
          </Tabs.TabPane>
          {datasourceType && this.renderTypeList(datasourceType)}
          <Tabs.TabPane
            key="businessAttr"
            forceRender
            tab={formatMessage({ id: 'dc.projectConfig.businessAttr', defaultMessage: '业务属性' })}
          >
            {!BaseInfoLoading && (
              <BusinessInfo
                editType={editType}
                Ref={v => {
                  this.BusinessInfo = v;
                }}
              />
            )}
          </Tabs.TabPane>
        </Tabs>
      </Spin>
    );
  };

  footerRender = isBlood => {
    const { datasourceType, sqlLoading, standardLoading, loading } = this.props;
    const { activeTabKey, editType } = this.state;
    const ComponentList = this.renderTypeList(datasourceType, true);
    ComponentList.unshift({
      key: 'metaDataInfo',
    });
    ComponentList.push({
      key: 'businessAttr',
    });
    // 左边列表 补充基础信息
    this.ComponentList = ComponentList;
    if (isBlood) {
      return (
        <div className="buttons-group">
          <Button onClick={() => this.onCancel()} page-data-collect="dc-modelManage-cancel">
            {formatMessage({ id: 'COMMON_CANCEL', defaultMessage: '取消' })}
          </Button>
        </div>
      );
    }

    // 获取 step metaDataInfo
    const step = ComponentList.findIndex(item => item.key == activeTabKey);
    // ADD_BUTTON_SQL_NEW
    if (editType === ADD_BUTTON_SQL_NEW) {
      return (
        <div className="buttons-group">
          <Button onClick={() => this.onCancel()} page-data-collect="dc-modelManage-cancel">
            {formatMessage({ id: 'COMMON_CANCEL', defaultMessage: '取消' })}
          </Button>

          <Button
            type="primary"
            loading={sqlLoading}
            onClick={() => this.SqlNext()}
            page-data-collect="dc-modelManage-nextStep"
          >
            {formatMessage({ id: 'dc.projectConfig.nextStep', defaultMessage: '下一步' })}
          </Button>
        </div>
      );
    }
    return (
      <div className="buttons-group">
        <Button onClick={() => this.onCancel()} page-data-collect="dc-modelManage-cancel">
          {formatMessage({ id: 'COMMON_CANCEL', defaultMessage: '取消' })}
        </Button>
        {step != 0 && (
          <Button
            type="primary"
            onClick={() => this.handlePreStep(step)}
            page-data-collect="dc-modelManage-preStep"
          >
            {formatMessage({ id: 'dc.projectConfig.preStep', defaultMessage: '上一步' })}
          </Button>
        )}
        {step != ComponentList.length - 1 && (
          <Button
            type="primary"
            loading={loading} // 如果数据未加载完 点击下一步 校验数据源时会因为未匹配而置空
            onClick={() => this.handleNextStep(step)}
            page-data-collect="dc-modelManage-nextStep"
          >
            {formatMessage({ id: 'dc.projectConfig.nextStep', defaultMessage: '下一步' })}
          </Button>
        )}
        {step > 0 && (
          <Button
            type="primary"
            onClick={() => this.handleSubmit()}
            loading={standardLoading}
            page-data-collect="dc-modelManage-handleSubmit"
          >
            {formatMessage({ id: 'COMMON_OK', defaultMessage: '确定' })}
          </Button>
        )}
      </div>
    );
  };

  handleTabChange = key => {
    this.setState({ activeTabTopKey: key });
  };

  render() {
    const {
      currentRecord,
      DirectoryTreeData,
      datasourceTypeList,
      loading,
      canOperate,
      standardMode,
      visible,
    } = this.props;
    const { iframe, activeTabTopKey, showCheckRuleTip, checkResult } = this.state;
    const titleLabel = getModelTitle(standardMode, currentRecord.metaDataCode);
    if (iframe) {
      if (
        DirectoryTreeData &&
        DirectoryTreeData.length &&
        datasourceTypeList &&
        datasourceTypeList.length
      ) {
        return this.containRender();
      }
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <Spin spinning={!!loading} wrapperClassName={classnames('full-height-spin')}>
            {!loading && <Empty />}
          </Spin>
        </div>
      );
    }

    const isBlood = activeTabTopKey === MODEL_BLOOD;
    return (
      <ModalDrawer
        visible={visible}
        width={canOperate ? 1180 : 1100}
        title={canOperate ? titleLabel : ''}
        onCancel={this.onCancel}
        className={!canOperate ? styles.ModalDrawer : ''}
        // onOk={this.handleSubmit}
        confirmLoading={loading}
        noPadding
        footer={this.footerRender(isBlood)}
        id="modelManage-modal"
      >
        {canOperate && this.containRender()}
        {!canOperate && (
          <div className={styles.fromDevView}>
            <Tabs
              className={styles.tabH}
              defaultActiveKey={MODEL_DETAIL}
              onChange={this.handleTabChange}
            >
              <Tabs.TabPane tab={titleLabel} key={MODEL_DETAIL}>
                {this.containRender()}
              </Tabs.TabPane>
              <Tabs.TabPane
                tab={formatMessage({ id: 'dc.metadata.modelBlood', defaultMessage: '模型血缘' })}
                key={MODEL_BLOOD}
              >
                <ModelBlood modelData={currentRecord} />
              </Tabs.TabPane>
            </Tabs>
          </div>
        )}

        {showCheckRuleTip && (
          <CheckResultModal
            title={formatMessage({
              id: 'dc.ScriptSpecification.SaveConfirm',
              defaultMessage: '保存确认',
            })}
            oper={formatMessage({ id: 'masterData.save', defaultMessage: '保存' })}
            checkResult={checkResult.passNum}
            onCancel={() => {
              this.setState({
                checkResult: {},
                showCheckRuleTip: false,
              });
            }}
            handSubmit={() => {
              this._handleSubmit();
            }}
            ResultEleRender={() => <ResultContent checkResult={checkResult} />}
          />
        )}
      </ModalDrawer>
    );
  }
}

export default ModelStandard;

// used by iframe(route), for data source preview
// pay attention to ${ROUTER_BASE}
//

/* <Modal
  title="Test"
  width={900}
  destroyOnClose={true}
  visible={visible}
  onCancel={() => {
    this.setState({
      visible: false
    });
  }}
>
  <Iframe
    url=`${ROUTER_BASE}/ext/dc/model/detail?modelId=9530`
    width='100%'
    height='500px'
    className='dataSourceIframe'
    display='block'
    position='relative'
  />
</Modal> */
