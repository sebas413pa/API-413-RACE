'use strict';

const config = require('../config/config');

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;
const DATA_URL_PREFIX = /^data:/i;

const getAssetBaseUrl = () => {
  const configuredBase = typeof config.assets?.baseUrl === 'string' ? config.assets.baseUrl.trim() : '';
  if (configuredBase.length) return configuredBase.replace(/\/$/, '');

  const protocol = typeof config.protocol === 'string' && config.protocol.trim().length
    ? config.protocol.trim().replace(/:$/, '')
    : 'http';
  const host = typeof config.host === 'string' ? config.host.trim() : '';
  if (!host.length) return null;
  const numericPort = Number(config.port);
  const shouldAppendPort = Number.isFinite(numericPort) && numericPort > 0
    && !((protocol === 'https' && numericPort === 443) || (protocol === 'http' && numericPort === 80));
  const portSegment = shouldAppendPort ? `:${numericPort}` : '';
  return `${protocol}://${host}${portSegment}`;
};

const resolvePublicAssetUrl = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  if (ABSOLUTE_URL_REGEX.test(trimmed) || DATA_URL_PREFIX.test(trimmed)) return trimmed;
  const base = getAssetBaseUrl();
  if (!base) return null;
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${normalizedPath}`;
};

module.exports = {
  getAssetBaseUrl,
  resolvePublicAssetUrl,
};