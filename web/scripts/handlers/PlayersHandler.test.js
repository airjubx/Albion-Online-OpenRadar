import {describe, test, expect, beforeEach, vi} from 'vitest';
import {loadFixture, normalizeParams} from '../__fixtures__/loader.js';

vi.mock('../utils/SettingsSync.js', () => ({
    default: {
        getBool: vi.fn(() => true),
        getNumber: vi.fn((_k, d) => d),
        getJSON: vi.fn(() => null),
    },
}));

vi.mock('../data/ZonesDatabase.js', () => ({
    default: {
        getPvpType: vi.fn(() => 'safe'),
    },
}));

const {PlayersHandler} = await import('./PlayersHandler.js');
const settingsSync = (await import('../utils/SettingsSync.js')).default;
const zonesDatabase = (await import('../data/ZonesDatabase.js')).default;

describe('PlayersHandler', () => {
    let handler;

    beforeEach(() => {
        vi.clearAllMocks();
        settingsSync.getBool.mockReturnValue(true);
        settingsSync.getNumber.mockImplementation((_k, d) => d);
        zonesDatabase.getPvpType.mockReturnValue('safe');

        window.logger = {debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn()};
        window.currentMapId = 'safe-zone-01';

        handler = new PlayersHandler();
    });

    describe('handleNewPlayerEvent (event 29)', () => {
        // @verified 2026-04-18: passive player (faction=0) from pcap adds a Player entity to the list.
        test('pcap-derived spawn: passive player faction=0 adds entity', async () => {
            const fx = await loadFixture('players', 'spawn');
            const msg = fx.messages.find(m => m.parameters['53'] === 0);
            expect(msg).toBeDefined();
            const p = normalizeParams(msg.parameters);

            handler.handleNewPlayerEvent(p[0], p);

            expect(handler.getSize()).toBe(1);
            const player = handler.playersList[0];
            expect(player.id).toBe(p[0]);
            expect(player.nickname).toBe(p[1]);
            expect(player.faction).toBe(0);
        });

        // @verified 2026-04-18: faction player (faction=5) lands with stored faction value.
        test('pcap-derived spawn: faction=5 player stores faction field', async () => {
            const fx = await loadFixture('players', 'spawn');
            const msg = fx.messages.find(m => m.parameters['53'] === 5);
            expect(msg).toBeDefined();
            const p = normalizeParams(msg.parameters);

            handler.handleNewPlayerEvent(p[0], p);

            expect(handler.playersList[0].faction).toBe(5);
        });

        // @suspect 2026-04-18 PLAY-1 (issue #65): hostile player in unknown zone does not trigger alert because zonesDatabase falls back to 'safe' for missing zones, and isPlayerThreat returns false for 'safe'.
        test('synthetic hostile in unknown zone: alert should fire but does not', () => {
            zonesDatabase.getPvpType.mockReturnValue('safe');
            window.currentMapId = 'UNMAPPED_AVALON_HIDEOUT';
            const playSpy = vi.spyOn(handler.audio, 'play').mockResolvedValue();

            handler.handleNewPlayerEvent(1, {1: 'Hostile', 8: '', 53: 255, 51: null, 40: [], 43: []});

            expect(handler.getSize()).toBe(1);
            expect(playSpy).not.toHaveBeenCalled();
        });
    });
});
