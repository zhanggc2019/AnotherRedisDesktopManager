import electron from './electron';
import * as phpSerialize from 'php-serialize';
import { ObjectInputStream } from 'java-object-serialization';
import { Parser } from 'pickleparser';
import { decode } from 'algo-msgpack-with-bigint';
import { getData } from 'rawproto';
import zlib from 'zlib';

// Internal data store
const internalData = {};

export function get(name) {
  return internalData[name];
}

export function set(name, value) {
  internalData[name] = value;
}

export function bufVisible(buf) {
  if (typeof buf === 'string') {
    return true;
  }

  return buf.equals(Buffer.from(buf.toString()));
}

export function bufToString(buf, forceHex = false) {
  // if (typeof buf == 'string') {
  //   return buf;
  // }

  if (!Buffer.isBuffer(buf)) {
    return buf;
  }

  if (!forceHex && bufVisible(buf)) {
    return buf.toString();
  }

  return bufToHex(buf);
}

export function bufToQuotation(buf) {
  const str = bufToString(buf).replaceAll('"', '\\"');
  return `"${str}"`;
}

export function bufToHex(buf) {
  const result = buf.toJSON().data.map((item) => {
    if (item >= 32 && item <= 126) {
      return String.fromCharCode(item);
    }
    return `\\x${item.toString(16).padStart(2, 0)}`;
  });

  return result.join('');
}

export function xToBuffer(str) {
  let result = '';

  for (let i = 0; i < str.length;) {
    if (str.substr(i, 2) == '\\x') {
      result += str.substr(i + 2, 2);
      i += 4;
    } else {
      result += Buffer.from(str[i++]).toString('hex');
    }
  }

  return Buffer.from(result, 'hex');
}

export function bufToBinary(buf) {
  let binary = '';

  for (const item of buf) {
    binary += item.toString(2).padStart(8, 0);
  }

  return binary;
}

export function binaryStringToBuffer(str) {
  const groups = str.match(/[01]{8}/g);
  const numbers = groups.map(binary => parseInt(binary, 2));

  return Buffer.from(new Uint8Array(numbers));
}

export function cutString(string, maxLength = 20) {
  if (string.length <= maxLength) {
    return string;
  }

  return `${string.substr(0, maxLength)}...`;
}

export function isJson(string) {
  try {
    const obj = JSON.parse(string);
    return !!obj && typeof obj === 'object';
  } catch (e) {}

  return false;
}

export function isPHPSerialize(str) {
  try {
    // phpSerialize.unserialize(str);
    return phpSerialize.isSerialized(str.toString());
  } catch (e) {}

  return false;
}

export function isJavaSerialize(buf) {
  try {
    const result = (new ObjectInputStream(buf)).readObject();
    return typeof result === 'object';
  } catch (e) {
    return false;
  }
}

export function isPickle(buf) {
  try {
    const result = (new Parser()).parse(buf);
    return !!result;
  } catch (e) {
    return false;
  }
}

export function isMsgpack(buf) {
  try {
    const result = decode(buf);
    if (['object', 'string'].includes(typeof result)) {
      return true;
    }
  } catch (e) {}

  return false;
}

export function isBrotli(buf) {
  return typeof zippedToString(buf, 'brotli') === 'string';
}

export function isGzip(buf) {
  return typeof zippedToString(buf, 'gzip') === 'string';
}

export function isDeflate(buf) {
  return typeof zippedToString(buf, 'deflate') === 'string';
}

export function isDeflateRaw(buf) {
  return typeof zippedToString(buf, 'deflateRaw') === 'string';
}

export function isProtobuf(buf) {
  // fix #859, #880, exclude number type
  if (!isNaN(buf)) {
    return false;
  }

  try {
    const result = getData(buf);

    // fix #922 some str mismatch
    if (result[0]) {
      const firstEle = Object.values(result[0])[0];
      if (firstEle < 1e-14 || firstEle.low) {
        return false;
      }
    }
    return true;
  } catch (e) {}

  return false;
}

export function zippedToString(buf, type = 'unzip') {
  const funMap = {
    // unzip will automatically detect Gzip or Deflate header
    unzip: 'unzipSync',
    gzip: 'gunzipSync',
    deflate: 'inflateSync',
    brotli: 'brotliDecompressSync',
    deflateRaw: 'inflateRawSync',
  };

  try {
    const decompressed = zlib[funMap[type]](buf);
    if (Buffer.isBuffer(decompressed) && decompressed.length) {
      return decompressed.toString();
    }
  } catch (e) {}

  return false;
}

export function base64Encode(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

export function base64Decode(str) {
  return Buffer.from(str, 'base64').toString('utf8');
}

export function humanFileSize(size = 0) {
  if (!size) {
    return 0;
  }
  const i = Math.floor(Math.log(size) / Math.log(1024));
  return (size / Math.pow(1024, i)).toFixed(2) * 1 + ['B', 'KB', 'MB', 'GB', 'TB'][i];
}

export function leftTime(seconds) {
  if (seconds == 0 || seconds == -1) {
    return '';
  }

  let str = '';

  if (seconds >= 86400) {
    str += `${parseInt(seconds / 60 / 60 / 24)} day, `;
  }
  if (seconds >= 3600) {
    str += `${parseInt(seconds / 60 / 60 % 24)} hour, `;
  }
  if (seconds >= 60) {
    str += `${parseInt(seconds / 60 % 60)} min, `;
  }

  str += `${parseInt(seconds % 60)} sec`;

  return str;
}

export function cloneObjWithBuff(object) {
  const clone = JSON.parse(JSON.stringify(object));

  for (const i in clone) {
    if ((typeof clone[i] === 'object') && (clone[i].type === 'Buffer')) {
      clone[i] = Buffer.from(clone[i]);
    }
  }

  return clone;
}

export function keysToList(keys) {
  return keys.map((key) => {
    const item = {
      name: bufToString(key),
      nameBuffer: key.toJSON(),
    };

    item.key = item.name;
    return item;
  });
}

export function keysToTree(keys, separator = ':', openStatus = {}, forceCut = 20000) {
  const tree = {};
  keys.forEach((key) => {
    let currentNode = tree;
    const keyStr = bufToString(key);
    const keySplited = keyStr.split(separator);
    const lastIndex = keySplited.length - 1;

    keySplited.forEach((value, index) => {
      // key node
      if (index === lastIndex) {
        currentNode[`${keyStr}\`k\``] = {
          keyNode: true,
          nameBuffer: key,
        };
      }
      // folder node
      else {
        (currentNode[value] === undefined) && (currentNode[value] = {});
      }

      currentNode = currentNode[value];
    });
  });

  // to tree format
  return formatTreeData(tree, '', openStatus, separator, forceCut);
}

export function formatTreeData(tree, previousKey = '', openStatus = {}, separator = ':', forceCut = 20000) {
  return Object.keys(tree).map((key) => {
    const node = { name: key || '[Empty]' };

    // folder node
    if (!tree[key].keyNode && Object.keys(tree[key]).length > 0) {
      // fullName
      const tillNowKeyName = previousKey + key + separator;

      // folder's fullName may same with key name, such as 'aa-'
      // for unique, add 'F' prefix
      node.key = `F${tillNowKeyName}`;
      node.open = openStatus.has(node.key);
      node.children = formatTreeData(tree[key], tillNowKeyName, openStatus, separator, forceCut);
      node.keyCount = node.children.reduce((a, b) => a + (b.keyCount || 1), 0);
      // too many children, force cut, do not incluence keyCount display
      // node.open && node.children.length > forceCut && node.children.splice(forceCut);
      // keep folder node in front of the tree and sorted(not include the outest list)
      // async sort, only for opened folders
      node.open && sortKeysAndFolder(node.children);
      node.fullName = tillNowKeyName;
    }
    // key node
    else {
      // node.keyCount = 1;
      node.name = key.replace(/`k`$/, '');
      node.nameBuffer = tree[key].nameBuffer.toJSON();
      node.key = node.name;
    }

    return node;
  });
}

// nodes is reference, keep folder in front and sorted,
// keep keys in tail and sorted
// sortByData
export function sortKeysAndFolder(nodes) {
  nodes.sort((a, b) => {
    // a & b are all keys
    if (!a.children && !b.children) {
      return a.name > b.name ? 1 : -1;
    }
    // a & b are all folder
    if (a.children && b.children) {
      return a.name > b.name ? 1 : -1;
    }

    // a is folder, b is key
    if (a.children) {
      return -1;
    }
    // a is key, b is folder

    return 1;
  });
}

// sortByTreeNode
export function sortByTreeNodes(nodes) {
  nodes.sort((a, b) => {
    // a & b are all keys
    if (a.isLeaf && b.isLeaf) {
      return a.label > b.label ? 1 : -1;
    }
    // a & b are all folder
    if (!a.isLeaf && !b.isLeaf) {
      return a.label > b.label ? 1 : -1;
    }

    // a is folder, b is key
    if (!a.isLeaf) {
      return -1;
    }
    // a is key, b is folder

    return 1;
  });
}

export function copyToClipboard(text) {
  electron.writeText(text ? text.toString() : '');
}

export function debounce(func, wait, immediate = false, context = null) {
  let timeout;
  let result;

  const debounced = function () {
    const args = arguments;
    timeout && clearTimeout(timeout);

    const later = function () {
      timeout = null;
      if (!immediate) result = func.apply(context, args);
    };

    const callNow = immediate && !timeout;
    timeout = setTimeout(later, wait);
    if (callNow) result = func.apply(context, args);

    return result;
  };
  debounced.cancel = function () {
    clearTimeout(timeout);
    timeout = null;
  };

  return debounced;
}

export function randomString(len = 5) {
  return Math.random().toString(36).substr(-len);
}

export function createAndDownloadFile(fileName, content) {
  const aTag = document.createElement('a');
  const blob = new Blob([content]);

  aTag.download = fileName;
  aTag.href = URL.createObjectURL(blob);

  aTag.click();
  URL.revokeObjectURL(blob);
}

export function arrayChunk(arr, size) {
  return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.splice(0, size));
}

// Default export for backward compatibility with global properties
export default {
  data: internalData,
  get,
  set,
  bufVisible,
  bufToString,
  bufToQuotation,
  bufToHex,
  xToBuffer,
  bufToBinary,
  binaryStringToBuffer,
  cutString,
  isJson,
  isPHPSerialize,
  isJavaSerialize,
  isPickle,
  isMsgpack,
  isBrotli,
  isGzip,
  isDeflate,
  isDeflateRaw,
  isProtobuf,
  zippedToString,
  base64Encode,
  base64Decode,
  humanFileSize,
  leftTime,
  cloneObjWithBuff,
  keysToList,
  keysToTree,
  formatTreeData,
  sortKeysAndFolder,
  sortByTreeNodes,
  copyToClipboard,
  debounce,
  randomString,
  createAndDownloadFile,
  arrayChunk,
};
