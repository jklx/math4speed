const categories = require('../shared/categories.json');

function sanitizeActivitySettings(category, input) {
  const config = categories[category];
  if (!config) return {};
  return Object.fromEntries((config.settings || []).map(setting => {
    const value = input?.[setting.key];
    const valid = setting.control === 'radio'
      ? setting.options.some(option => option.value === value)
      : typeof value === 'boolean';
    return [setting.key, valid ? value : setting.defaultValue];
  }));
}

module.exports = { sanitizeActivitySettings };
