import { describe, expect, it } from 'vitest'
import soldierFieldData from '../data/venues/soldier-field.json'
import { VenueSchema } from './venue'

describe('VenueSchema', () => {
  it('accepts the local Soldier Field overview data', () => {
    const result = VenueSchema.safeParse(soldierFieldData)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.decks).toHaveLength(3)
      expect(result.data.decks.flatMap((deck) => deck.sections)).toHaveLength(36)
    }
  })

  it('rejects venue data with invalid geometry', () => {
    const result = VenueSchema.safeParse({
      ...soldierFieldData,
      decks: [
        {
          ...soldierFieldData.decks[0],
          innerRadiusX: 500,
          outerRadiusX: 400,
        },
      ],
    })

    expect(result.success).toBe(false)
  })
})
