import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RalFormProps = {
  ral: string;
  mensilita: string;
  errore: string | null;
  onRalChange: (valore: string) => void;
  onMensilitaChange: (valore: string) => void;
  onSubmit: () => void;
};

const MENSILITA_DISPONIBILI = ["12", "13", "14"];

/** Form di input: RAL, mensilità contrattuali e azione di calcolo. */
export function RalForm({
  ral,
  mensilita,
  errore,
  onRalChange,
  onMensilitaChange,
  onSubmit,
}: RalFormProps) {
  return (
    <form
      className="space-y-2"
      onSubmit={(evento) => {
        evento.preventDefault();
        onSubmit();
      }}
    >
      {/*
        I tre controlli hanno la stessa altezza (h-8): allineandoli in basso
        finiscono a filo senza compensare a mano l'altezza delle etichette.
        Il messaggio d'errore sta fuori da questa riga, altrimenti allungherebbe
        la colonna della RAL sfalsando di nuovo gli altri controlli.
      */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="ral">RAL - Retribuzione Annua Lorda</Label>
          <div className="relative">
            <Input
              id="ral"
              type="number"
              inputMode="decimal"
              min={0}
              step={100}
              placeholder="30000"
              value={ral}
              onChange={(evento) => onRalChange(evento.target.value)}
              aria-invalid={errore !== null}
              aria-describedby={errore ? "ral-errore" : undefined}
              className="pr-8 tabular-nums"
            />
            <span
              aria-hidden
              className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm"
            >
              €
            </span>
          </div>
        </div>

        <div className="space-y-2 sm:w-36">
          <Label htmlFor="mensilita">Mensilità</Label>
          {/*
            Il wrapper non è decorativo: Select monta anche un <select> nativo
            nascosto come fratello del trigger, che diventerebbe l'ultimo figlio
            della colonna. Con space-y-2 il margine finisce sui figli tranne
            l'ultimo, quindi il trigger si prenderebbe 8px in più dell'input.
          */}
          <div>
            <Select value={mensilita} onValueChange={onMensilitaChange}>
              <SelectTrigger id="mensilita" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MENSILITA_DISPONIBILI.map((valore) => (
                  <SelectItem key={valore} value={valore}>
                    {valore} mensilità
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button type="submit" className="sm:min-w-32">
          Calcola
        </Button>
      </div>

      {errore ? (
        <p id="ral-errore" role="alert" className="text-destructive text-sm">
          {errore}
        </p>
      ) : null}
    </form>
  );
}
