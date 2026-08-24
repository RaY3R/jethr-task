import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { formattaEuro } from "@/lib/format";
import { FONTI, numeroFonte, type IdFonte, type RisultatoNetto } from "@/lib/taxEngine";
import { cn } from "@/lib/utils";

/**
 * Ruolo di una riga nella scomposizione, che ne determina segno e peso visivo:
 * - `base`    importo di partenza
 * - `addebito` voce che aumenta il prelievo (segno −)
 * - `credito`  voce che lo riduce (segno +, sono le detrazioni)
 * - `subtotale` risultato intermedio di una sezione
 */
type Ruolo = "base" | "addebito" | "credito" | "subtotale";

type Riga = {
  etichetta: string;
  nota?: string;
  importo: number;
  ruolo: Ruolo;
  /** Fonte normativa da cui deriva l'aliquota della voce. I subtotali non ne hanno: sono somme. */
  fonte?: IdFonte;
};

/**
 * Richiamo di nota accanto a una voce: porta all'elenco "Fonti" e vi evidenzia
 * la riga corrispondente. È un <button> e non un'ancora perché il bersaglio sta
 * dentro un accordion chiuso, che va prima aperto.
 */
function RichiamoFonte({ id, onApri }: { id: IdFonte; onApri: (id: IdFonte) => void }) {
  const numero = numeroFonte(id);
  const fonte = FONTI.find((f) => f.id === id);

  return (
    <button
      type="button"
      onClick={() => onApri(id)}
      aria-label={`Fonte ${numero}: ${fonte?.voce ?? ""}`}
      className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 ml-1.5 inline-flex size-4 -translate-y-1 cursor-pointer items-center justify-center rounded-full align-baseline text-[0.625rem] font-medium tabular-nums transition-colors focus-visible:ring-3 focus-visible:outline-none"
    >
      {numero}
    </button>
  );
}

/**
 * Prefisso di segno mostrato accanto all'importo, coerente con il ruolo della riga.
 * Un importo nullo resta senza segno: "− 0,00 €" si legge male e non aggiunge nulla.
 */
function segno(ruolo: Ruolo, importo: number): string {
  if (importo === 0) return "";
  if (ruolo === "addebito") return "− ";
  if (ruolo === "credito") return "+ ";
  return "";
}

function RigaVoce({ riga, onApriFonte }: { riga: Riga; onApriFonte: (id: IdFonte) => void }) {
  const eSubtotale = riga.ruolo === "subtotale";

  return (
    <TableRow className={cn(eSubtotale && "bg-muted/40")}>
      <TableCell className={cn("py-2.5", eSubtotale ? "font-medium" : "text-muted-foreground")}>
        {eSubtotale ? "= " : ""}
        {riga.etichetta}
        {riga.nota ? (
          <span className="text-muted-foreground/70 ml-2 text-xs">{riga.nota}</span>
        ) : null}
        {riga.fonte ? <RichiamoFonte id={riga.fonte} onApri={onApriFonte} /> : null}
      </TableCell>
      <TableCell
        className={cn(
          "py-2.5 text-right tabular-nums",
          eSubtotale ? "font-medium" : "text-foreground",
          riga.ruolo === "credito" && "text-muted-foreground",
        )}
      >
        {segno(riga.ruolo, riga.importo)}
        {formattaEuro(riga.importo)}
      </TableCell>
    </TableRow>
  );
}

function Totale({
  etichetta,
  nota,
  importo,
  enfasi,
}: {
  etichetta: string;
  nota?: string;
  importo: number;
  enfasi?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 rounded-lg px-3 py-3",
        enfasi ? "bg-primary text-primary-foreground" : "bg-muted",
      )}
    >
      <div>
        <p className="text-sm font-medium tracking-wide uppercase">{etichetta}</p>
        {nota ? (
          <p className={cn("text-xs", enfasi ? "opacity-70" : "text-muted-foreground")}>{nota}</p>
        ) : null}
      </div>
      <p className="text-xl font-semibold tabular-nums sm:text-2xl">{formattaEuro(importo)}</p>
    </div>
  );
}

/** Scomposizione riga per riga del calcolo, in stile busta paga semplificata. */
export function BustaPaga({
  risultato,
  mensilita,
  onApriFonte,
}: {
  risultato: RisultatoNetto;
  mensilita: number;
  onApriFonte: (id: IdFonte) => void;
}) {
  const eSommaEsente = risultato.cuneo.tipo === "sommaEsente";

  const contributive: Riga[] = [
    { etichetta: "RAL lorda", importo: risultato.ral, ruolo: "base" },
    {
      etichetta: "Contributi INPS",
      nota: "9,19%",
      importo: risultato.contributiInps,
      ruolo: "addebito",
      fonte: "inps",
    },
    { etichetta: "Imponibile fiscale", importo: risultato.imponibileFiscale, ruolo: "subtotale" },
  ];

  const fiscali: Riga[] = [
    {
      etichetta: "IRPEF lorda",
      importo: risultato.irpefLorda,
      ruolo: "addebito",
      fonte: "irpef",
    },
    {
      etichetta: "Detrazione lavoro dipendente",
      importo: risultato.detrazioneLavoro,
      ruolo: "credito",
      fonte: "detrazioneLavoro",
    },
    // Il cuneo compare tra le voci IRPEF solo quando agisce da detrazione; come
    // somma esente non tocca l'imposta e viene accreditato più in basso, nel netto.
    ...(eSommaEsente
      ? []
      : [
          {
            etichetta: "Cuneo fiscale",
            nota: "detrazione",
            importo: risultato.cuneo.importo,
            ruolo: "credito",
            fonte: "cuneo",
          } satisfies Riga,
        ]),
    { etichetta: "IRPEF netta", importo: risultato.irpefNetta, ruolo: "subtotale" },
  ];

  const addizionali: Riga[] = [
    {
      etichetta: "Addizionale regionale",
      nota: "Lombardia",
      importo: risultato.addRegionale,
      ruolo: "addebito",
      fonte: "addRegionale",
    },
    {
      etichetta: "Addizionale comunale",
      nota: "Milano",
      importo: risultato.addComunale,
      ruolo: "addebito",
      fonte: "addComunale",
    },
  ];

  if (eSommaEsente) {
    addizionali.push({
      etichetta: "Cuneo fiscale",
      nota: "somma esente",
      importo: risultato.cuneo.importo,
      ruolo: "credito",
      fonte: "cuneo",
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scomposizione</CardTitle>
        <CardDescription>
          Anno d'imposta 2026.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <Table>
          <TableBody>
            {contributive.map((riga) => (
              <RigaVoce key={riga.etichetta} riga={riga} onApriFonte={onApriFonte} />
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <Badge variant="secondary">Imposta sul reddito</Badge>
          <Separator className="flex-1" />
        </div>

        <Table>
          <TableBody>
            {fiscali.map((riga) => (
              <RigaVoce key={riga.etichetta} riga={riga} onApriFonte={onApriFonte} />
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <Badge variant="secondary">Addizionali locali</Badge>
          <Separator className="flex-1" />
        </div>

        <Table>
          <TableBody>
            {addizionali.map((riga) => (
              <RigaVoce key={`${riga.etichetta}-${riga.nota}`} riga={riga} onApriFonte={onApriFonte} />
            ))}
          </TableBody>
        </Table>

        <Separator />

        <div className="space-y-2">
          <Totale etichetta="Netto annuo" importo={risultato.nettoAnnuo} enfasi />
          <Totale
            etichetta="Netto mensile"
            nota={`su ${mensilita} mensilità`}
            importo={risultato.nettoMensile}
          />
        </div>
      </CardContent>
    </Card>
  );
}
