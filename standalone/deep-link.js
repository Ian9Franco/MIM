/** Convert only MIM links to the local application origin. */
function toLocalUrl(url, port) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'mim:' || parsed.username || parsed.password || parsed.port) {
    throw new Error('Invalid MIM protocol URL');
  }
  const targetPath = `${parsed.hostname ? `/${parsed.hostname}` : ''}${parsed.pathname || ''}` || '/';
  return `http://127.0.0.1:${port}${targetPath}${parsed.search}${parsed.hash}`;
}

module.exports = { toLocalUrl };
