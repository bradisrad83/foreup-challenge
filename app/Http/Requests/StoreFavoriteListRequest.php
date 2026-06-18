<?php

namespace App\Http\Requests;

use App\Models\FavoriteList;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreFavoriteListRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
        ];
    }

    /**
     * Run additional validation after the base rules pass.
     *
     * Checks for case-insensitive name uniqueness via normalized_name,
     * providing a friendly 422 before the DB unique constraint fires.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            $name = $this->string('name')->trim()->value();

            if ($name === '') {
                return; // Handled by 'required' rule above
            }

            $normalized = FavoriteList::normalizeName($name);

            if (FavoriteList::where('normalized_name', $normalized)->exists()) {
                $v->errors()->add('name', 'A list with this name already exists.');
            }
        });
    }
}
