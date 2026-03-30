/**
 * Redis 连接测试脚本
 * 用于测试与本地 Redis 实例的连接和基本操作
 */

const Redis = require('ioredis');

async function testRedisConnection() {
  console.log('🚀 开始 Redis 连接测试...\n');

  // 创建 Redis 客户端
  const client = new Redis({
    host: '127.0.0.1',
    port: 6379,
    password: 'redis3.14',
    db: 0,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  try {
    // 测试 1: 连接
    console.log('✓ 测试 1: 连接到 Redis');
    await client.ping();
    console.log('  ✅ 连接成功\n');

    // 测试 2: String 类型
    console.log('✓ 测试 2: String 数据类型');
    await client.set('test:string', 'Hello, Redis!');
    const stringValue = await client.get('test:string');
    console.log(`  设置值: "Hello, Redis!"`);
    console.log(`  获取值: "${stringValue}"`);
    console.log(`  ✅ String 类型测试通过\n`);

    // 测试 3: Hash 类型
    console.log('✓ 测试 3: Hash 数据类型');
    await client.hset('test:hash', 'field1', 'value1', 'field2', 'value2');
    const hashValue = await client.hgetall('test:hash');
    console.log(`  设置 Hash: { field1: "value1", field2: "value2" }`);
    console.log(`  获取 Hash:`, hashValue);
    console.log(`  ✅ Hash 类型测试通过\n`);

    // 测试 4: List 类型
    console.log('✓ 测试 4: List 数据类型');
    await client.rpush('test:list', 'item1', 'item2', 'item3');
    const listValue = await client.lrange('test:list', 0, -1);
    console.log(`  设置 List: ["item1", "item2", "item3"]`);
    console.log(`  获取 List:`, listValue);
    console.log(`  ✅ List 类型测试通过\n`);

    // 测试 5: Set 类型
    console.log('✓ 测试 5: Set 数据类型');
    await client.sadd('test:set', 'member1', 'member2', 'member3');
    const setValue = await client.smembers('test:set');
    console.log(`  设置 Set: ["member1", "member2", "member3"]`);
    console.log(`  获取 Set:`, setValue);
    console.log(`  ✅ Set 类型测试通过\n`);

    // 测试 6: ZSet 类型
    console.log('✓ 测试 6: ZSet (Sorted Set) 数据类型');
    await client.zadd('test:zset', 1, 'member1', 2, 'member2', 3, 'member3');
    const zsetValue = await client.zrange('test:zset', 0, -1, 'WITHSCORES');
    console.log(`  设置 ZSet: { member1: 1, member2: 2, member3: 3 }`);
    console.log(`  获取 ZSet:`, zsetValue);
    console.log(`  ✅ ZSet 类型测试通过\n`);

    // 测试 7: 键操作
    console.log('✓ 测试 7: 键操作');
    const keys = await client.keys('test:*');
    console.log(`  查询所有 test:* 键:`, keys);
    console.log(`  ✅ 键操作测试通过\n`);

    // 测试 8: TTL 操作
    console.log('✓ 测试 8: TTL (过期时间) 操作');
    await client.setex('test:ttl', 10, 'expire-value');
    const ttl = await client.ttl('test:ttl');
    console.log(`  设置 TTL: 10 秒`);
    console.log(`  获取 TTL:`, ttl, '秒');
    console.log(`  ✅ TTL 操作测试通过\n`);

    // 测试 9: 删除操作
    console.log('✓ 测试 9: 删除操作');
    const delCount = await client.del('test:string', 'test:hash', 'test:list', 'test:set', 'test:zset', 'test:ttl');
    console.log(`  删除 ${delCount} 个键`);
    console.log(`  ✅ 删除操作测试通过\n`);

    // 测试 10: 数据库信息
    console.log('✓ 测试 10: 数据库信息');
    const info = await client.info('stats');
    const lines = info.split('\r\n').slice(0, 5);
    console.log(`  Redis 信息:`);
    lines.forEach(line => {
      if (line && !line.startsWith('#')) {
        console.log(`    ${line}`);
      }
    });
    console.log(`  ✅ 数据库信息测试通过\n`);

    console.log('✅ 所有测试通过！\n');
    console.log('📊 测试总结:');
    console.log('  ✓ 连接测试');
    console.log('  ✓ String 类型');
    console.log('  ✓ Hash 类型');
    console.log('  ✓ List 类型');
    console.log('  ✓ Set 类型');
    console.log('  ✓ ZSet 类型');
    console.log('  ✓ 键操作');
    console.log('  ✓ TTL 操作');
    console.log('  ✓ 删除操作');
    console.log('  ✓ 数据库信息\n');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  } finally {
    // 关闭连接
    await client.quit();
    console.log('🔌 连接已关闭');
  }
}

// 运行测试
testRedisConnection().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
