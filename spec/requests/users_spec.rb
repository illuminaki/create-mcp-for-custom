require 'swagger_helper'

RSpec.describe 'Users API', type: :request do
  path '/users' do
    get 'Retrieves all users' do
      tags 'Users'
      produces 'application/json'

      response '200', 'users found' do
        schema type: :array, items: { '$ref' => '#/components/schemas/user' }
        run_test!
      end
    end

    post 'Creates a user' do
      tags 'Users'
      consumes 'application/json'
      parameter name: :user, in: :body, schema: {
        type: :object,
        properties: {
          user: {
            type: :object,
            properties: {
              name: { type: :string },
              score: { type: :integer }
            },
            required: %w[name score]
          }
        }
      }

      response '201', 'user created' do
        let(:user) { { user: { name: 'John Doe', score: 100 } } }
        run_test!
      end

      response '422', 'invalid request' do
        let(:user) { { user: { name: nil } } }
        run_test!
      end
    end
  end

  path '/users/{id}' do
    parameter name: :id, in: :path, type: :string

    get 'Retrieves a user' do
      tags 'Users'
      produces 'application/json'

      response '200', 'user found' do
        schema '$ref' => '#/components/schemas/user'
        let(:id) { User.create(name: 'John Doe', score: 100).id }
        run_test!
      end

      response '404', 'user not found' do
        let(:id) { 'invalid' }
        run_test!
      end
    end

    patch 'Updates a user' do
      tags 'Users'
      consumes 'application/json'
      parameter name: :user, in: :body, schema: {
        type: :object,
        properties: {
          user: {
            type: :object,
            properties: {
              name: { type: :string },
              score: { type: :integer }
            }
          }
        }
      }

      response '200', 'user updated' do
        let(:id) { User.create(name: 'John Doe', score: 100).id }
        let(:user) { { user: { name: 'Jane Doe' } } }
        run_test!
      end
    end

    delete 'Deletes a user' do
      tags 'Users'

      response '204', 'user deleted' do
        let(:id) { User.create(name: 'John Doe', score: 100).id }
        run_test!
      end
    end
  end
end
