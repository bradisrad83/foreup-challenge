<?php

namespace App\Services\TvMaze;

use RuntimeException;

/**
 * Thrown when the TVmaze upstream call fails (timeout, non-success status, etc.).
 * Controllers catch this and return a controlled 502 response.
 */
class TvMazeException extends RuntimeException {}
