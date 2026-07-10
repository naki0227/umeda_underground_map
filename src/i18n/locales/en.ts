import type { ja } from './ja';

type Resource = { [K in keyof typeof ja]: Record<keyof (typeof ja)[K], string> };

export const en: Resource = {
  app: {
    title: 'Umeda Underground Navi',
    subtitle: 'Navigation for the Umeda underground mall',
    dataVersionNote: 'Shop and exit data as of {{version}}',
  },
  locate: {
    title: 'Find where you are',
    description: 'Pick the entrance you used and shops you can see nearby.',
    entranceLabel: 'Where did you enter the underground? (if known)',
    entranceNone: 'Not selected',
    entrancePoiGroup: 'From a building / spot above ground',
    entranceExitGroup: 'If you know the exit number / gate',
    gpsButton: 'Use approximate location',
    gpsAcquired: 'Location acquired',
    gpsFailed: 'Could not get location (GPS is unreliable underground)',
    shopsLabel: 'Shops you can see nearby (multiple allowed)',
    shopsPlaceholder: 'Search shop name',
    locateButton: 'Estimate my location',
    candidatesTitle: 'Are you around here?',
    candidateConfidence: 'Confidence {{percent}}%',
    noCandidates: 'Could not estimate. Try selecting one or two more shops.',
    confirm: "I'm here",
  },
  search: {
    placeholder: 'Search places, shops, exits',
    kindPoi: 'Above ground',
    kindShop: 'Shop',
    kindNode: 'Exit / Station',
  },
  place: {
    goHere: 'Directions',
    setHere: "I'm here now",
    aboveGroundNote: 'This place is above ground. We guide you to the nearest exit.',
  },
  mapUi: {
    setLocation: 'Set my location',
  },
  sheet: {
    close: 'Close',
  },
  route: {
    title: 'Directions',
    total: 'Total approx. {{distance}}m ({{minutes}} min walk)',
    from: 'From: {{name}}',
    to: 'To: {{name}}',
    stepGo: 'Walk about {{distance}}m',
    actionLeft: 'Turn left at {{name}}',
    actionRight: 'Turn right at {{name}}',
    actionUturn: 'Turn back at {{name}}',
    actionArrive: 'Arrive at {{name}}',
    actionFloorUp: 'Take the {{via}} at {{name}} up to {{floor}}',
    actionFloorDown: 'Take the {{via}} at {{name}} down to {{floor}}',
    aboveGroundHint:
      '{{name}} is above ground. We guide you to {{exit}} — go up to street level from there.',
    notFound: 'No route found',
    newSearch: 'Choose another destination',
  },
  lost: {
    button: "I'm lost",
    description: 'Let’s re-check where you are. Pick the shops you can see now.',
  },
  report: {
    title: 'Something wrong?',
    description: 'If a shop or exit differs from reality, please let us know.',
    link: 'Report an error (Google Form)',
  },
  facility: {
    stairs: 'stairs',
    escalator: 'escalator',
    elevator: 'elevator',
    slope: 'slope',
  },
  map: {
    title: 'Umeda underground map',
    you: 'You are here',
    destination: 'Destination',
    caption: 'This map is schematic. Distances and positions are approximate.',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    resetView: 'Fit view',
  },
  language: {
    label: 'Language',
  },
};
