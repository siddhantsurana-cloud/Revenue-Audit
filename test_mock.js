
const auditEngine = require('./auditEngine');
const database = require('./database');

async function test() {
    await database.initDatabase();
    const cache = await auditEngine.preloadAuditCache('TARIFF_DATA');
    const item = {
        serviceId: 'A63589',
        serviceName: 'ADMISSION CHARGE',
        billedRate: 900,
        dept: 'Admission',
        roomCategory: 'Others'
    };
    const res = await auditEngine.validateAuditItem(item, { tariffMapped: 'TARIFF_DATA' }, 'TARIFF_DATA', cache);
    console.log(JSON.stringify(res, null, 2));
}
test();
