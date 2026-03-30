import {
  ArrowUp,
  CircleClose,
  CirclePlus,
  DCaret,
  Delete,
  Document,
  Download,
  Edit,
  InfoFilled,
  Loading,
  Operation,
  Plus,
  QuestionFilled,
  Refresh,
  Search,
  Setting,
  StarFilled,
  Timer,
  Top,
  Upload,
  View,
} from '@element-plus/icons-vue';

const iconMap = {
  'el-icon-arrow-up': ArrowUp,
  'el-icon-circle-plus': CirclePlus,
  'el-icon-d-caret': DCaret,
  'el-icon-delete': Delete,
  'el-icon-document': Document,
  'el-icon-download': Download,
  'el-icon-edit': Edit,
  'el-icon-edit-outline': Edit,
  'el-icon-error': CircleClose,
  'el-icon-info': InfoFilled,
  'el-icon-loading': Loading,
  'el-icon-menu': Operation,
  'el-icon-plus': Plus,
  'el-icon-question': QuestionFilled,
  'el-icon-refresh': Refresh,
  'el-icon-search': Search,
  'el-icon-setting': Setting,
  'el-icon-star-on': StarFilled,
  'el-icon-time': Timer,
  'el-icon-to-top': Top,
  'el-icon-upload': Upload,
  'el-icon-upload2': Upload,
  'el-icon-view': View,
};

export function resolveElIcon(name = '') {
  return iconMap[name] || null;
}

export function isElIconName(name = '') {
  return !!resolveElIcon(name);
}
