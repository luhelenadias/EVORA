import React from 'react';
import CampoContrato from '@/components/contracts/CampoContrato';
import { CAMPOS_CONTRATO } from '@/lib/contratos';

/** Grade de campos do contrato, com fonte no PDF e comparação com o valor extraído. */
export default function ContractFieldsReview({ valores, fontes = [], camposRevisar = [], extraido = {}, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {CAMPOS_CONTRATO.map((campo) => (
        <div key={campo.key} className={campo.tipo === 'texto_longo' ? 'sm:col-span-2' : ''}>
          <CampoContrato
            campo={campo}
            valor={valores[campo.key]}
            extraido={extraido[campo.key]}
            fonte={fontes.find((f) => f.campo === campo.key)}
            revisar={camposRevisar.includes(campo.key)}
            onChange={(valor) => onChange(campo.key, valor)}
          />
        </div>
      ))}
    </div>
  );
}