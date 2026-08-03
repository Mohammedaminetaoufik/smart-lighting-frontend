import { describe, expect, it } from 'vitest'
import { normalizeMarkdown } from '../components/ai/markdown'

describe('normalizeMarkdown', () => {
  it('repairs legacy AI answers with glued sections and recommendations', () => {
    const input = '**Constat principal :** La LCU est hors ligne.\n\n' +
      'Analyse métier- Elle ne répond plus depuis 24 h. Les équipements sont rattachés.- Le score est critique.\n\n' +
      'Implications opérationnelles- La supervision est interrompue.\n\n' +
      'Recommandations1. Vérifier l’alimentation. 2. Contrôler la liaison radio.'

    const result = normalizeMarkdown(input)

    expect(result).toContain('### Constat principal\n\nLa LCU est hors ligne.')
    expect(result).toContain('### Analyse métier\n\nElle ne répond plus depuis 24 h.')
    expect(result).toContain('rattachés.\n\n- Le score est critique.')
    expect(result).toContain('### Implications opérationnelles\n\nLa supervision est interrompue.')
    expect(result).toContain('### Recommandations\n\n1. Vérifier l’alimentation.\n2. Contrôler la liaison radio.')
  })

  it('keeps already valid Markdown sections and lists intact', () => {
    const input = '### Résultat\n\n**0 %**\n\n### Actions recommandées\n\n1. Vérifier la LCU.\n2. Contrôler le réseau.'

    expect(normalizeMarkdown(input)).toBe(input)
  })
})
