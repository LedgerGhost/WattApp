import type { Charger } from '../../types'
import { ChargerCard } from '..'
import './ChargersList.css'

interface ChargersListProps {
  chargers: Charger[]
  selectedChargerId: string | null
  onSelectCharger: (charger: Charger) => void
}

export default function ChargersList({
  chargers,
  selectedChargerId,
  onSelectCharger
}: ChargersListProps) {
  return (
    <div className="chargers-list">
      {chargers.map(charger => (
        <ChargerCard
          key={charger.id}
          charger={charger}
          isSelected={selectedChargerId === charger.id}
          onClick={() => onSelectCharger(charger)}
        />
      ))}
    </div>
  )
}
