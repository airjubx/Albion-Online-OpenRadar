import {describe, test, expect, beforeEach, vi} from 'vitest';
import {loadFixture, normalizeParams} from '../__fixtures__/loader.js';

vi.mock('../utils/SettingsSync.js', () => ({
    default: {
        getBool: vi.fn(() => true),
        getJSON: vi.fn(() => ({
            e0: Array(8).fill(true),
            e1: Array(8).fill(true),
            e2: Array(8).fill(true),
            e3: Array(8).fill(true),
            e4: Array(8).fill(true),
        })),
    },
}));

const {MobsHandler, EnemyType} = await import('./MobsHandler.js');
const settingsSync = (await import('../utils/SettingsSync.js')).default;

const allTrueSettings = {
    e0: Array(8).fill(true),
    e1: Array(8).fill(true),
    e2: Array(8).fill(true),
    e3: Array(8).fill(true),
    e4: Array(8).fill(true),
};

describe('MobsHandler', () => {
    let handler;

    beforeEach(() => {
        vi.clearAllMocks();
        settingsSync.getJSON.mockReturnValue(allTrueSettings);
        settingsSync.getBool.mockReturnValue(true);

        window.logger = {debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn()};
        window.mobsDatabase = {
            isLoaded: true,
            getMobInfo: vi.fn((typeId) => {
                if (typeId === 422) return {isHarvestable: true, type: 'Hide', tier: 2, uniqueName: 'T2_MOB_FOX'};
                if (typeId === 424 || typeId === 428) return {isHarvestable: true, type: 'Hide', tier: 3, uniqueName: 'T3_MOB_WOLF'};
                if (typeId === 529 || typeId === 531) return {isHarvestable: true, type: 'Hide', tier: 4, uniqueName: 'T4_MOB_BEAR'};
                if (typeId === 2067 || typeId === 2070 || typeId === 2082 || typeId === 2085) {
                    return {isHarvestable: false, category: 'standard', uniqueName: 'T6_MOB_UNDEAD', tier: 6};
                }
                return null;
            }),
        };
        handler = new MobsHandler();
    });

    describe('NewMobEvent (event 123)', () => {
        // @verified 2026-04-18: Mist spawn (name present in Parameters[32]) adds to mistList with 'solo' type heuristic.
        test('pcap-derived spawn: mist MISTS_SOLO_YELLOW adds to mistList', async () => {
            const fx = await loadFixture('mobs', 'spawn');
            const msg = fx.messages.find(m => m.parameters['32'] === 'MISTS_SOLO_YELLOW');
            expect(msg).toBeDefined();
            const p = normalizeParams(msg.parameters);

            handler.NewMobEvent(p);

            const sizes = handler.getSize();
            expect(sizes.mists).toBe(1);
            expect(sizes.mobs).toBe(0);
        });

        // @verified 2026-04-18: living mob with known typeId=424 adds to mobsList as LivingSkinnable (Hide).
        test('pcap-derived spawn: living Hide mob typeId=424 adds as LivingSkinnable', async () => {
            const fx = await loadFixture('mobs', 'spawn');
            const msg = fx.messages.find(m => m.parameters['1'] === 424);
            expect(msg).toBeDefined();
            const p = normalizeParams(msg.parameters);

            handler.NewMobEvent(p);

            const mobs = handler.getMobList();
            expect(mobs).toHaveLength(1);
            expect(mobs[0].type).toBe(EnemyType.LivingSkinnable);
            expect(mobs[0].name).toBe('Hide');
        });
    });
});
