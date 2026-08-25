import { ExternalLink } from "lucide-react";
import { useEffect, useRef } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { ASSUNZIONI, FONTI, type IdFonte } from "@/lib/taxEngine";
import { cn } from "@/lib/utils";

/** Fonte richiamata da una voce della busta paga, con un contatore per rilanciare lo scroll. */
export type FonteRichiamata = { id: IdFonte; richiesta: number };

type NoteMetodologicheProps = {
  sezioniAperte: string[];
  onSezioniAperteChange: (sezioni: string[]) => void;
  fonteRichiamata: FonteRichiamata | null;
};

/** Assunzioni del modello e riferimenti normativi delle aliquote applicate. */
export function NoteMetodologiche({
  sezioniAperte,
  onSezioniAperteChange,
  fonteRichiamata,
}: NoteMetodologicheProps) {
  const elencoFonti = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!fonteRichiamata) return;

    // Il contenuto dell'accordion monta e si anima all'apertura: senza attendere
    // la fine dell'animazione lo scroll punterebbe a una posizione non definitiva.
    const timer = window.setTimeout(() => {
      // Scroll immediato e non animato: `behavior: "smooth"` non ha effetto
      // quando il bersaglio sta dentro un antenato con overflow nascosto come
      // il contenuto dell'accordion, e resterebbe un salto silenziosamente
      // mancato. È anche la semantica di un normale salto a nota.
      elencoFonti.current
        ?.querySelector(`#fonte-${fonteRichiamata.id}`)
        ?.scrollIntoView({ behavior: "auto", block: "center" });
    }, 220);

    return () => window.clearTimeout(timer);
  }, [fonteRichiamata]);

  return (
    <Card>
      <CardContent>
        <Accordion type="multiple" value={sezioniAperte} onValueChange={onSezioniAperteChange}>
          <AccordionItem value="assunzioni">
            <AccordionTrigger>Assunzioni</AccordionTrigger>
            <AccordionContent>
              <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm pb-4">
                {ASSUNZIONI.map((assunzione) => (
                  <li key={assunzione}>{assunzione}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="fonti" className="border-b-0">
            <AccordionTrigger>Fonti</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground mb-4 text-sm text-pretty">
                I numeri accanto alle voci della scomposizione rimandano qui. Ogni link porta alla
                fonte ufficiale, non a una sintesi di terze parti.
              </p>

              <ol ref={elencoFonti} className="space-y-1">
                {FONTI.map((fonte, indice) => (
                  <li
                    key={fonte.id}
                    id={`fonte-${fonte.id}`}
                    className={cn(
                      "flex gap-3 rounded-lg p-2 transition-colors",
                      fonteRichiamata?.id === fonte.id && "bg-muted",
                    )}
                  >
                    <span
                      aria-hidden
                      className="bg-muted text-muted-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums"
                    >
                      {indice + 1}
                    </span>

                    <div className="min-w-0 space-y-1 text-sm">
                      <p className="font-medium">{fonte.voce}</p>
                      <p className="text-muted-foreground text-pretty">{fonte.dettaglio}</p>

                      {/* Una voce può poggiare su più norme: ognuna ha il proprio link. */}
                      <ul className="space-y-1 pt-1">
                        {fonte.riferimenti.map((riferimento) => (
                          <li key={riferimento.url}>
                            <a
                              href={riferimento.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex items-baseline gap-1.5 rounded-sm text-pretty underline underline-offset-4 focus-visible:ring-3 focus-visible:outline-none"
                            >
                              <span>
                                {riferimento.etichetta}
                                <span className="text-muted-foreground/70 no-underline">
                                  {" · "}
                                  {riferimento.editore}
                                </span>
                              </span>
                              <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                              <span className="sr-only">(si apre in una nuova scheda)</span>
                            </a>

                            {/*
                              Abrogazione a effetto differito: la norma è già
                              abrogata ma resta quella applicabile all'anno
                              calcolato, e va detto per non citare una fonte
                              che sembra superata.
                            */}
                            {riferimento.abrogatoDa ? (
                              <p className="text-muted-foreground/70 text-xs text-pretty">
                                Abrogato da{" "}
                                <a
                                  href={riferimento.abrogatoDa.riferimento.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:text-foreground focus-visible:ring-ring/50 rounded-sm underline underline-offset-4 focus-visible:ring-3 focus-visible:outline-none"
                                >
                                  {riferimento.abrogatoDa.riferimento.etichetta}
                                </a>{" "}
                                con effetto dal {riferimento.abrogatoDa.dal.toLocaleDateString()}: resta la norma
                                applicabile all'anno d'imposta 2026.
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
