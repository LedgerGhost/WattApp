export interface Station {
    station_name: string
    coordinates: {
        lat: number
        lon: number
    }
    points: number[]
    dist_from_user?: number
}