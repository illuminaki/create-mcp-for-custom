require 'swagger_helper'

RSpec.describe 'Books API', type: :request do
  path '/books' do
    get 'Retrieves all books' do
      tags 'Books'
      produces 'application/json'

      response '200', 'books found' do
        schema type: :array, items: { '$ref' => '#/components/schemas/book' }
        run_test!
      end
    end

    post 'Creates a book' do
      tags 'Books'
      consumes 'application/json'
      parameter name: :book, in: :body, schema: {
        type: :object,
        properties: {
          book: {
            type: :object,
            properties: {
              title: { type: :string },
              desc: { type: :string }
            },
            required: %w[title desc]
          }
        }
      }

      response '201', 'book created' do
        let(:book) { { book: { title: 'New Book', desc: 'Description' } } }
        run_test!
      end

      response '422', 'invalid request' do
        let(:book) { { book: { title: nil } } }
        run_test!
      end
    end
  end

  path '/books/{id}' do
    parameter name: :id, in: :path, type: :string

    get 'Retrieves a book' do
      tags 'Books'
      produces 'application/json'

      response '200', 'book found' do
        schema '$ref' => '#/components/schemas/book'
        let(:id) { Book.create(title: 'foo', desc: 'bar').id }
        run_test!
      end

      response '404', 'book not found' do
        let(:id) { 'invalid' }
        run_test!
      end
    end

    patch 'Updates a book' do
      tags 'Books'
      consumes 'application/json'
      parameter name: :book, in: :body, schema: {
        type: :object,
        properties: {
          book: {
            type: :object,
            properties: {
              title: { type: :string },
              desc: { type: :string }
            }
          }
        }
      }

      response '200', 'book updated' do
        let(:id) { Book.create(title: 'foo', desc: 'bar').id }
        let(:book) { { book: { title: 'Updated Title' } } }
        run_test!
      end
    end

    delete 'Deletes a book' do
      tags 'Books'

      response '204', 'book deleted' do
        let(:id) { Book.create(title: 'foo', desc: 'bar').id }
        run_test!
      end
    end
  end
end
