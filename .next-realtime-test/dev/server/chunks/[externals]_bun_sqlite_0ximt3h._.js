module.exports = [
"[externals]/bun:sqlite [external] (bun:sqlite, cjs, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/[externals]_bun_sqlite_1aygq0y._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[externals]/bun:sqlite [external] (bun:sqlite, cjs)");
    });
});
}),
];