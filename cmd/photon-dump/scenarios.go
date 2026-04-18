package main

// MatchCriteria selects a decoded Photon message by kind, opcode, and optional
// parameter predicates. All fields are AND-ed. nil map = wildcard.
type MatchCriteria struct {
	Kind  string                    // "event" | "request" | "response"
	Code  int                       // event code (252) / op code (253)
	Where map[byte]func(v any) bool // optional per-parameter filter
}

// Scenario declares a single fixture extraction target.
type Scenario struct {
	Name        string          // "players/passive-player-spawn"
	Handler     string          // "players"
	Match       MatchCriteria   // primary trigger
	FollowUps   []MatchCriteria // optional, in order, on the same correlation key
	CorrelateBy byte            // parameter key to follow entity across packets (e.g. 0 for id)
	Limit       int             // max matches for this scenario (0 = 1)
}

// scenarios is populated progressively during later tasks (Task 16 wires the full catalog).
// Kept as a package var so main.go can reference it even while empty.
var scenarios []Scenario
