import React from 'react';
import { UserPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Escolha do técnico responsável por uma preventiva ainda não atribuída. */
export default function AssignTechnicianSelect({ tecnicos = [], onSelect, disabled }) {
  return (
    <div className="w-full sm:w-56 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      <Select onValueChange={onSelect} disabled={disabled}>
        <SelectTrigger className="h-8 text-xs gap-1.5">
          <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
          <SelectValue placeholder="Atribuir técnico..." />
        </SelectTrigger>
        <SelectContent>
          {tecnicos.map((tecnico) => (
            <SelectItem key={tecnico.id} value={tecnico.id}>
              {tecnico.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}