/**
 * Basic example — programmatic usage of Ant.js
 */

const AntJS = require('../src/index');

async function main() {
  const colony = await AntJS.create({
    url: 'https://example.com',
    ai: {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY,
    },
    colony: {
      headless: true,
      retries: 1,
    },
    test: {
      depth: 1,
    },
  });

  colony.on('log', (entry) => {
    console.log(`[${entry.source || entry.agent}] ${entry.message}`);
  });

  colony.on('agent:completed', ({ agent, result }) => {
    console.log(`\n✅ Agent ${agent.name} finished!`);
  });

  await colony.initialize();
  const results = await colony.run('https://example.com');

  console.log('\n🏁 FINAL RESULTS:');
  console.log(`- Pages discovered: ${results.scout?.pages?.length || 0}`);
  console.log(`- Scenarios generated: ${results.analyst?.scenarios?.length || 0}`);
  console.log(`- Tests passed: ${results.actor?.results?.filter(r => r.status === 'passed').length || 0}`);
  console.log(`- Tests failed: ${results.actor?.results?.filter(r => r.status === 'failed').length || 0}`);
  console.log(`- Healed by AI: ${results.healer?.fixes?.filter(f => f.healed).length || 0}`);
  console.log(`- Report: ${results.reporter?.htmlPath}`);

  await colony.shutdown();
}

main().catch(console.error);
