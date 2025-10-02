import "module-alias/register.js";
import moduleAlias from "module-alias";
moduleAlias.addAlias("~", process.cwd());

import { DataAdapterV2GitHub } from "../utils/dataAdapterV2GitHub.ts";
import { CreationAdapterServer } from "../utils/creationAdapterServer.ts";

async function main() {
  const adapter = new DataAdapterV2GitHub("Ocytowine", "ArchiveValmorinTest", { cacheDir: "./tmp" });
  const service = new CreationAdapterServer(adapter as any);
  await service.init();
  const result = await service.buildPreview({ class: "guerrier", background: "soldat", niveau: 1 }, { base_stats_before_race: { strength: 15 } });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
