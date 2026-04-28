import { SectionCard } from "@/components/ui/section-card";

export default function ArchitecturePage() {
  return (
    <main className="app-shell">
      <div className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
        <SectionCard
          title="Architektur"
          description="Kurze In-App-Dokumentation fuer die Schichten, Modulgrenzen und den Savegame-Datenfluss."
        >
          <div className="space-y-6 text-sm leading-7 text-slate-200">
            <p>
              Das Frontend liegt im Next.js App Router und rendert nur View-Modelle.
              Game-Logik und Savegame-Aufbau leben in Application Services innerhalb der
              Module `savegames`, `teams` und `seasons`.
            </p>
            <p>
              Repositories kapseln Prisma-Zugriffe. Das Prisma-Schema trennt statische
              Referenzdaten wie Liga, Konferenzen, Divisionen, Franchises und Positionen
              vom dynamischen Savegame-Zustand mit Teams, Spielern, Vertraegen,
              Matches und Statistiken.
            </p>
            <p>
              Der Beispiel-Datenfluss startet bei `createSaveGame`, bootstrapt Season,
              Teams, Spieler, Vertraege und Matches und wird anschliessend ueber
              Query-Services fuer Savegame-, Team- und Saisonseiten wieder gelesen.
            </p>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
