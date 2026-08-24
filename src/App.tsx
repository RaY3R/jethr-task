import { useState } from "react";

import { BustaPaga } from "@/components/BustaPaga";
import { NoteMetodologiche, type FonteRichiamata } from "@/components/NoteMetodologiche";
import { RalForm } from "@/components/RalForm";
import { Card, CardContent } from "@/components/ui/card";
import { calcolaNetto, type IdFonte, type RisultatoNetto } from "@/lib/taxEngine";

/** Esito della validazione dell'input: o una RAL utilizzabile, o il messaggio d'errore. */
function validaRal(grezzo: string): { ral: number } | { errore: string } {
  const normalizzato = grezzo.trim().replace(",", ".");
  if (normalizzato === "") return { errore: "Inserisci la tua RAL per procedere." };

  const ral = Number(normalizzato);
  if (!Number.isFinite(ral)) return { errore: "Inserisci un importo numerico valido." };
  if (ral <= 0) return { errore: "La RAL deve essere maggiore di zero." };

  return { ral };
}

function App() {
  const [ral, setRal] = useState("");
  const [mensilita, setMensilita] = useState("13");
  const [errore, setErrore] = useState<string | null>(null);
  const [calcolo, setCalcolo] = useState<{
    risultato: RisultatoNetto;
    mensilita: number;
  } | null>(null);
  const [sezioniAperte, setSezioniAperte] = useState<string[]>(["assunzioni"]);
  const [fonteRichiamata, setFonteRichiamata] = useState<FonteRichiamata | null>(null);

  /**
   * Un richiamo di nota apre la sezione "Fonti" se è chiusa e vi evidenzia la voce.
   * Il contatore `richiesta` fa ripartire lo scroll anche quando si riclicca la
   * stessa nota dopo essersi allontanati dall'elenco.
   */
  function apriFonte(id: IdFonte) {
    setSezioniAperte((sezioni) => (sezioni.includes("fonti") ? sezioni : [...sezioni, "fonti"]));
    setFonteRichiamata((precedente) => ({ id, richiesta: (precedente?.richiesta ?? 0) + 1 }));
  }

  /** Ricalcola con le mensilità appena scelte, così il risultato già a video resta coerente. */
  function cambiaMensilita(valore: string) {
    setMensilita(valore);
    if (!calcolo) return;

    const mensilitaNumero = Number(valore);
    setCalcolo({
      risultato: calcolaNetto(calcolo.risultato.ral, mensilitaNumero),
      mensilita: mensilitaNumero,
    });
  }

  function calcola() {
    const esito = validaRal(ral);

    if ("errore" in esito) {
      setErrore(esito.errore);
      setCalcolo(null);
      return;
    }

    const mensilitaNumero = Number(mensilita);
    setErrore(null);
    setCalcolo({
      risultato: calcolaNetto(esito.ral, mensilitaNumero),
      mensilita: mensilitaNumero,
    });
  }

  return (
    <main className="bg-background text-foreground min-h-svh px-4 py-10 sm:py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Calcolatore stipendio netto
          </h1>
        </header>

        <Card>
          <CardContent>
            <RalForm
              ral={ral}
              mensilita={mensilita}
              errore={errore}
              onRalChange={(valore) => {
                setRal(valore);
                if (errore) setErrore(null);
              }}
              onMensilitaChange={cambiaMensilita}
              onSubmit={calcola}
            />
          </CardContent>
        </Card>

        {calcolo ? (
          <BustaPaga
            risultato={calcolo.risultato}
            mensilita={calcolo.mensilita}
            onApriFonte={apriFonte}
          />
        ) : null}

        <NoteMetodologiche
          sezioniAperte={sezioniAperte}
          onSezioniAperteChange={setSezioniAperte}
          fonteRichiamata={fonteRichiamata}
        />

      </div>
    </main>
  );
}

export default App;
