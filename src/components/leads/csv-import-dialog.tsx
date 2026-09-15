'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CSV_TEMPLATE_HEADERS } from '@/lib/constants';
import type { ImportLeadRow } from '@/lib/types';

interface CsvPreviewRow {
  row: number;
  data: Omit<ImportLeadRow, 'name'> & { name: string };
  error?: string;
}

export function CsvImportDialog({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState<CsvPreviewRow[]>([]);
  const [fileName, setFileName] = React.useState('');
  const [importing, setImporting] = React.useState(false);

  const fatalErrors = rows.filter((r) => r.error).length;
  const validRows = rows.filter((r) => !r.error);

  function handleFile(file?: File) {
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (result) => {
        const preview: CsvPreviewRow[] = result.data
          .map((raw, index) => {
            const base: CsvPreviewRow = {
              row: index + 2,
              data: {
                name: (raw.name ?? '').trim(),
                source: raw.source ?? raw.lead_source ?? '',
              },
            };
            const keys = Object.keys(raw);
            const phoneKey =
              keys.find((k) => /phone|mobile|contact/i.test(k)) ?? 'phone';
            const emailKey =
              keys.find((k) => /email|mail/i.test(k)) ?? 'email';
            const companyKey =
              keys.find((k) => /company|business|org/i.test(k)) ?? 'company';
            base.data.phone = raw[phoneKey] ?? '';
            base.data.email = raw[emailKey] ?? '';
            base.data.company = raw[companyKey] ?? '';
            if (!base.data.name) {
              base.error = 'Missing name';
            } else {
              base.error = undefined;
            }
            return base;
          })
          .filter((r) => r.data.name || r.error);

        setRows(preview);
        setFileName(file.name);
      },
      error: () => {
        toast.error('Could not read that CSV file.');
      },
    });
  }

  function reset() {
    setRows([]);
    setFileName('');
  }

  function handleClose(openNext: boolean) {
    setOpen(openNext);
    if (!openNext) reset();
  }

  async function handleImport() {
    if (validRows.length === 0 || importing) return;
    setImporting(true);
    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows.map((r) => r.data) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Import failed');
      toast.success(`${data.imported} leads imported`);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import leads from CSV</DialogTitle>
          <DialogDescription>
            Preview first, then confirm. Columns: name, phone, email, company,
            source. Leads are inserted as unassigned.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="space-y-4">
            <label
              htmlFor="csv-file"
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-white px-6 py-10 text-center transition-colors hover:border-brand-accent hover:bg-gradient-gold/[0.04]"
            >
              <Upload className="h-8 w-8 text-brand-accent-dark" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Choose a CSV file
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  It will be previewed before anything is imported.
                </p>
              </div>
            </label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <p className="text-center text-xs text-muted-foreground">
              Expected header row:{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5">
                {CSV_TEMPLATE_HEADERS.join(', ')}
              </code>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{fileName}</span>{' '}
              — {validRows.length} ready
              {fatalErrors > 0 &&
                `, ${fatalErrors} row${fatalErrors > 1 ? 's' : ''} skipped (missing name)`}
            </p>
            <div className="max-h-72 overflow-auto rounded-md border">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 30).map((r) => (
                    <TableRow key={r.row}>
                      <TableCell className="text-muted-foreground">
                        {r.row}
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.data.name || (
                          <span className="text-destructive">
                            missing name
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{r.data.phone || '—'}</TableCell>
                      <TableCell>{r.data.email || '—'}</TableCell>
                      <TableCell>{r.data.company || '—'}</TableCell>
                      <TableCell>{r.data.source || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 30 && (
                <p className="border-t bg-slate-50 px-4 py-2 text-xs text-muted-foreground">
                  …and {rows.length - 30} more rows.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={reset}>
                Choose another file
              </Button>
              <Button
                type="button"
                variant="gold"
                disabled={validRows.length === 0 || importing}
                onClick={handleImport}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Importing…
                  </>
                ) : (
                  `Import ${validRows.length} lead${validRows.length > 1 ? 's' : ''}`
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}