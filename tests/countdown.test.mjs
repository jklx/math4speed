import assert from 'node:assert/strict'
import test from 'node:test'
import { createCountdown } from '../src/utils/countdown.js'

test('delayed callbacks account for the entire time spent in a browser dialog', () => {
  let now = 1000
  const timer = createCountdown(60, () => now)
  assert.equal(timer.remainingSeconds(), 60)
  now += 12500
  assert.equal(timer.remainingSeconds(), 48)
  now += 500
  assert.equal(timer.remainingSeconds(), 47)
})

test('a blocked or backgrounded browser cannot extend the deadline', () => {
  let now = 0
  const timer = createCountdown(60, () => now)
  now = 60000
  assert.equal(timer.remainingSeconds(), 0)
  now = 120000
  assert.equal(timer.remainingSeconds(), 0)
})

test('correction pauses preserve fractional seconds and exclude only paused time', () => {
  let now = 0
  const timer = createCountdown(60, () => now)
  now = 1250
  timer.pause()
  now = 51250
  assert.equal(timer.remainingSeconds(), 59)
  timer.resume()
  now += 750
  assert.equal(timer.remainingSeconds(), 58)
  now += 58000
  assert.equal(timer.remainingSeconds(), 0)
})

test('repeated pause and resume calls do not add extra time', () => {
  let now = 0
  const timer = createCountdown(10, () => now)
  timer.pause()
  now = 2000
  timer.pause()
  now = 5000
  timer.resume()
  now = 6000
  timer.resume()
  assert.equal(timer.remainingSeconds(), 9)
})

test('an expired attempt stays expired when a correction tries to pause it', () => {
  let now = 0
  const timer = createCountdown(10, () => now)
  now = 11000
  timer.pause()
  now = 20000
  timer.resume()
  assert.equal(timer.remainingSeconds(), 0)
})

test('delayed start countdowns do not postpone the game deadline', () => {
  let now = 0
  const timer = createCountdown(60, () => now, 3000)
  now = 8500
  assert.equal(timer.remainingSeconds(), 55)
})

test('a restarted or resumed attempt uses its own remaining duration', () => {
  let now = 0
  const previous = createCountdown(60, () => now)
  now = 20000
  const resumed = createCountdown(25, () => now)
  now += 10000
  assert.equal(previous.remainingSeconds(), 30)
  assert.equal(resumed.remainingSeconds(), 15)
})
