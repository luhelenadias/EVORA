import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Lê (ou cria com defaults) o registro único de ConfiguracaoInstituicao.
 * Compartilhado entre Settings, EquipmentForm, Dashboard e Equipment.
 */
export function useConfiguracao() {
  const { data, isLoading } = useQuery({
    queryKey: ['configuracaoInstituicao'],
    queryFn: async () => {
      const list = await base44.entities.ConfiguracaoInstituicao.list();
      if (list.length > 0) return list[0];
      return base44.entities.ConfiguracaoInstituicao.create({
        modelo_priorizacao: 'simples',
        avancado_usa_utilizacao: false,
      });
    },
  });
  return { config: data, isLoading };
}