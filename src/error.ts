export function unexpectedError(error: Error): void {
    console.error(`unexpected error: ${error.message}`);
    const BAD_EXIT_CODE = 1;
    process.exit(BAD_EXIT_CODE);
}
