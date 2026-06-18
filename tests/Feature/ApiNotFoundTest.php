<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * The generic API 404 fallback: any unmatched route under /api/* returns a
 * neutral "Not found." JSON body (resource-specific 404 messages are handled
 * locally at the route/controller level, not by this global fallback).
 */
class ApiNotFoundTest extends TestCase
{
    public function test_unknown_api_route_returns_generic_not_found(): void
    {
        $response = $this->getJson('/api/this-route-does-not-exist');

        $response->assertNotFound()
            ->assertExactJson(['message' => 'Not found.']);
    }
}
