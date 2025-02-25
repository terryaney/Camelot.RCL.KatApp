// NOTE: Moved this into sep file that RCL.ts could exclude so the code for TraceVerbosity wasn't generated in both katapp.js and rcl.js

// High to low... whatever level is set for options, when katapp logs, if the level specified in the log method is 
// lower, it will not be logged, so any 'errors' that should always be logged should use None as a level to guarantee it is displayed.
enum TraceVerbosity {
	None,
	Quiet,
	Minimal,
	Normal,
	Detailed,
	Diagnostic
}
