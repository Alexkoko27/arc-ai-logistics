import { assertDevDispatcherDatabase } from "../lib/dispatch/devDatabaseGuard";
import { seedDispatcherMockData } from "../lib/dispatch/mockData";

async function main() {
  assertDevDispatcherDatabase("seed dispatcher mock data");

  const result = await seedDispatcherMockData();
  console.log("Dispatcher mock data ready:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
