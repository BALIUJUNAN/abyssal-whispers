const { test, expect } = require('@playwright/test');

const RELEASE_AUDIO_FILES = [
  'combat_start.wav', 'combat_attack.wav', 'combat_hit.wav', 'combat_miss.wav',
  'combat_player_hurt.wav', 'combat_monster_attack.wav', 'combat_flee.wav',
  'combat_victory.wav', 'combat_item.wav', 'combat_communicate.wav',
  'ending_good.wav', 'ending_bad.wav', 'ending_hidden.wav', 'ending_neutral.wav',
  'weather_rain_loop.wav', 'weather_fog_loop.wav', 'weather_blood_moon_loop.wav',
  'safehouse_rest.wav', 'safehouse_unsettled.wav', 'safehouse_corrupt.wav',
  'travel_footsteps.wav', 'investigate_search.wav', 'ritual_progress.wav',
  'ritual_complete.wav',
];

test.describe('Release Audio', function () {
  test('the complete non-verbal pack is served as valid WAV data', async function ({ page, request }) {
    await page.goto('/');
    var wavSupported = await page.evaluate(function () {
      return document.createElement('audio').canPlayType('audio/wav') !== '';
    });
    expect(wavSupported).toBe(true);

    for (var i = 0; i < RELEASE_AUDIO_FILES.length; i += 1) {
      var response = await request.get('/audio/' + RELEASE_AUDIO_FILES[i]);
      expect(response.ok(), RELEASE_AUDIO_FILES[i] + ' should be served').toBe(true);
      var body = await response.body();
      expect(body.subarray(0, 4).toString('ascii')).toBe('RIFF');
      expect(body.subarray(8, 12).toString('ascii')).toBe('WAVE');
    }
  });
});
