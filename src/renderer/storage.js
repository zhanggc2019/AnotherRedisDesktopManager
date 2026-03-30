import { randomString } from './util';

// Export individual functions
export function getSetting(key) {
  let settings = localStorage.getItem('settings');
  settings = settings ? JSON.parse(settings) : {};

  return key ? settings[key] : settings;
}

export function saveSettings(settings) {
  settings = JSON.stringify(settings);
  return localStorage.setItem('settings', settings);
}

export function getFontFamily() {
  let fontFamily = getSetting('fontFamily');

  // set to default font-family
  if (
    !fontFamily || !fontFamily.length
    || fontFamily.toString() === 'Default Initial'
  ) {
    fontFamily = ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica',
      'Arial', 'sans-serif', 'Microsoft YaHei', 'Apple Color Emoji', 'Segoe UI Emoji'];
  }

  return fontFamily.map(line => `"${line}"`).join(',');
}

export function getCustomFormatter(name = '') {
  let formatters = localStorage.getItem('customFormatters');
  formatters = formatters ? JSON.parse(formatters) : [];

  if (!name) {
    return formatters;
  }

  for (const line of formatters) {
    if (line.name === name) {
      return line;
    }
  }
}

export function saveCustomFormatters(formatters = []) {
  return localStorage.setItem('customFormatters', JSON.stringify(formatters));
}

export function addConnection(connection) {
  editConnectionByKey(connection, '');
}

export function getConnections(returnList = false) {
  let connections = localStorage.connections || '{}';

  connections = JSON.parse(connections);

  if (returnList) {
    connections = Object.keys(connections).map(key => connections[key]);
    sortConnections(connections);
  }

  return connections;
}

export function editConnectionByKey(connection, oldKey = '') {
  oldKey = connection.key || oldKey;

  const connections = getConnections();
  delete connections[oldKey];

  updateConnectionName(connection, connections);
  const newKey = getConnectionKey(connection, true);
  connection.key = newKey;

  // new added has no order, add it. do not add when edit mode
  if (!oldKey && isNaN(connection.order)) {
    // connection.order = Object.keys(connections).length;
    const maxOrder = Math.max(...Object.values(connections).map(item => (!isNaN(item.order) ? item.order : 0)));
    connection.order = (maxOrder > 0 ? maxOrder : 0) + 1;
  }

  connections[newKey] = connection;
  setConnections(connections);
}

export function editConnectionItem(connection, items = {}) {
  const key = getConnectionKey(connection);
  const connections = getConnections();

  if (!connections[key]) {
    return;
  }

  Object.assign(connection, items);
  Object.assign(connections[key], items);
  setConnections(connections);
}

export function updateConnectionName(connection, connections) {
  let name = getConnectionName(connection);

  for (const key in connections) {
    // if 'name' same with others, add random suffix
    if (getConnectionName(connections[key]) == name) {
      name += ` (${randomString(3)})`;
      break;
    }
  }

  connection.name = name;
}

export function getConnectionName(connection) {
  return connection.name || `${connection.host}@${connection.port}`;
}

export function setConnections(connections) {
  localStorage.connections = JSON.stringify(connections);
}

export function deleteConnection(connection) {
  const connections = getConnections();
  const key = getConnectionKey(connection);

  delete connections[key];

  hookAfterDelConnection(connection);
  setConnections(connections);
}

export function getConnectionKey(connection, forceUnique = false) {
  if (Object.keys(connection).length === 0) {
    return '';
  }

  if (connection.key) {
    return connection.key;
  }

  if (forceUnique) {
    return `${new Date().getTime()}_${randomString(5)}`;
  }

  return connection.host + connection.port + connection.name;
}

export function sortConnections(connections) {
  connections.sort((a, b) => {
    // drag ordered
    if (!isNaN(a.order) && !isNaN(b.order)) {
      return parseInt(a.order) <= parseInt(b.order) ? -1 : 1;
    }

    // no ordered, by key
    if (a.key && b.key) {
      return a.key < b.key ? -1 : 1;
    }

    return a.key ? 1 : (b.key ? -1 : 0);
  });
}

export function reOrderAndStore(connections = []) {
  const newConnections = {};

  for (const index in connections) {
    const connection = connections[index];
    connection.order = parseInt(index);
    newConnections[getConnectionKey(connection, true)] = connection;
  }

  setConnections(newConnections);

  return newConnections;
}

export function getStorageKeyMap(type) {
  const typeMap = {
    cli_tip: 'cliTips',
    last_db: 'lastSelectedDb',
    custom_db: 'customDbName',
    search_tip: 'searchTips',
  };

  return type ? typeMap[type] : typeMap;
}

export function initStorageKey(prefix, connectionName) {
  return `${prefix}_${connectionName}`;
}

export function getStorageKeyByName(type = 'cli_tip', connectionName = '') {
  return initStorageKey(getStorageKeyMap(type), connectionName);
}

export function hookAfterDelConnection(connection) {
  const connectionName = getConnectionName(connection);
  const types = Object.keys(getStorageKeyMap());

  const willRemovedKeys = [];

  for (const type of types) {
    willRemovedKeys.push(getStorageKeyByName(type, connectionName));
  }

  willRemovedKeys.forEach(k => localStorage.removeItem(k));
}

// Default export for backward compatibility with global properties
export default {
  getSetting,
  saveSettings,
  getFontFamily,
  getCustomFormatter,
  saveCustomFormatters,
  addConnection,
  getConnections,
  editConnectionByKey,
  editConnectionItem,
  updateConnectionName,
  getConnectionName,
  setConnections,
  deleteConnection,
  getConnectionKey,
  sortConnections,
  reOrderAndStore,
  getStorageKeyMap,
  initStorageKey,
  getStorageKeyByName,
  hookAfterDelConnection,
};
