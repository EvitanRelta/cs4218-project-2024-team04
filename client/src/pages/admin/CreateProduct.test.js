import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import axios from 'axios'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import '@testing-library/jest-dom/extend-expect'
import toast from 'react-hot-toast'
import CreateProduct from './CreateProduct'

// Mocking dependencies
jest.mock('axios')
jest.mock('react-hot-toast')

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url')

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}))

jest.mock('../../components/Layout', () => ({ children }) => <div>{children}</div>)
jest.mock('../../components/AdminMenu', () => () => <div>Admin Menu</div>)

jest.mock('antd', () => ({
    Select: Object.assign(
        ({ children, onChange, placeholder }) => (
            <select
                data-testid='category-select'
                onChange={(e) => onChange(e.target.value)}
                aria-label={placeholder}
            >
                {children}
            </select>
        ),
        { Option: ({ children, value }) => <option value={value}>{children}</option> }
    ),
}))

describe('CreateProduct Component', () => {
    const mockCategories = [
        { _id: 'cat1', name: 'Category 1' },
        { _id: 'cat2', name: 'Category 2' },
    ]

    beforeEach(() => {
        jest.clearAllMocks()
        axios.get
            .mockResolvedValueOnce({ data: { success: true, category: mockCategories } })
            .mockResolvedValueOnce({ data: { success: true, category: mockCategories } })
    })

    it('renders without crashing', async () => {
        // Arrange
        const component = (
            <MemoryRouter>
                <Routes>
                    <Route path='/' element={<CreateProduct />} />
                </Routes>
            </MemoryRouter>
        )

        // Act
        render(component)

        // Assert
        await waitFor(() => {
            expect(screen.getByText('Create Product')).toBeInTheDocument()
        })
    })

    it('populates category dropdown with existing categories', async () => {
        // Arrange
        const component = (
            <MemoryRouter>
                <Routes>
                    <Route path='/' element={<CreateProduct />} />
                </Routes>
            </MemoryRouter>
        )

        // Act
        render(component)

        // Assert
        await waitFor(() => {
            const categorySelect = screen.getByRole('combobox', { name: /select a category/i })
            expect(categorySelect).toBeInTheDocument()
            expect(screen.getByText('Category 1')).toBeInTheDocument()
            expect(screen.getByText('Category 2')).toBeInTheDocument()
        })
    })

    it('updates category input value when a dropdown option is selected', async () => {
        // Arrange
        const component = (
            <MemoryRouter>
                <Routes>
                    <Route path='/' element={<CreateProduct />} />
                </Routes>
            </MemoryRouter>
        )
        render(component)

        // Act
        await waitFor(() => {
            const categorySelect = screen.getByRole('combobox', { name: /select a category/i })
            fireEvent.change(categorySelect, { target: { value: 'cat2' } })
            // Assert
            expect(categorySelect.value).toBe('cat2')
        })
    })

    it('opens browser prompt for uploading an image when "Upload Photo" button is clicked', async () => {
        // Arrange
        const component = (
            <MemoryRouter>
                <Routes>
                    <Route path='/' element={<CreateProduct />} />
                </Routes>
            </MemoryRouter>
        )
        render(component)

        // Act & Assert (combined due to the nature of this test)
        await waitFor(() => {
            const uploadButton = screen.getByText('Upload Photo')
            expect(uploadButton).toBeInTheDocument()
            const fileInput = uploadButton.closest('label').querySelector('input[type="file"]')
            expect(fileInput).toBeInTheDocument()
        })
    })

    it('previews the photo when an image is uploaded', async () => {
        // Arrange
        const component = (
            <MemoryRouter>
                <Routes>
                    <Route path='/' element={<CreateProduct />} />
                </Routes>
            </MemoryRouter>
        )
        render(component)
        const file = new File(['test'], 'test.png', { type: 'image/png' })

        // Act
        await waitFor(() => {
            const fileInput = screen
                .getByText('Upload Photo')
                .closest('label')
                .querySelector('input[type="file"]')
            fireEvent.change(fileInput, { target: { files: [file] } })
        })

        // Assert
        const previewImage = screen.getByAltText('product_photo')
        expect(previewImage).toBeInTheDocument()
        expect(previewImage.src).toBe('http://localhost/mocked-url')
    })

    // UI doesn't send the "shipping" product value in its POST request to the
    // server.
    it.failing(
        'sends POST request with all form data when "CREATE PRODUCT" is clicked',
        async () => {
            // Arrange
            let capturedFormData
            axios.post.mockImplementation((url, data) => {
                capturedFormData = data
                return Promise.resolve({
                    data: { success: true, message: 'Product Created Successfully' },
                })
            })
            const component = (
                <MemoryRouter>
                    <Routes>
                        <Route path='/' element={<CreateProduct />} />
                    </Routes>
                </MemoryRouter>
            )
            render(component)
            await waitFor(() => {
                expect(
                    screen.getByRole('combobox', { name: /select a category/i })
                ).toBeInTheDocument()
            })

            // Act
            fireEvent.change(screen.getByPlaceholderText('write a name'), {
                target: { value: 'Test Product' },
            })
            fireEvent.change(screen.getByPlaceholderText('write a description'), {
                target: { value: 'Test Description' },
            })
            fireEvent.change(screen.getByPlaceholderText('write a Price'), {
                target: { value: '100' },
            })
            fireEvent.change(screen.getByPlaceholderText('write a quantity'), {
                target: { value: '10' },
            })
            const categorySelect = screen.getByRole('combobox', { name: /select a category/i })
            fireEvent.change(categorySelect, { target: { value: 'cat1' } })
            const shippingSelect = screen.getByRole('combobox', { name: /select shipping/i })
            fireEvent.change(shippingSelect, { target: { value: '1' } })
            const fileInput = screen
                .getByText('Upload Photo')
                .closest('label')
                .querySelector('input[type="file"]')
            const file = new File(['test'], 'test.png', { type: 'image/png' })
            fireEvent.change(fileInput, { target: { files: [file] } })
            fireEvent.click(screen.getByText('CREATE PRODUCT'))

            // Assert
            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledWith(
                    '/api/v1/product/create-product',
                    expect.any(FormData)
                )
                expect(capturedFormData.get('name')).toBe('Test Product')
                expect(capturedFormData.get('description')).toBe('Test Description')
                expect(capturedFormData.get('price')).toBe('100')
                expect(capturedFormData.get('quantity')).toBe('10')
                expect(capturedFormData.get('category')).toBe('cat1')
                expect(capturedFormData.get('shipping')).toBe('1')
                const photoFile = capturedFormData.get('photo')
                expect(photoFile).toBeInstanceOf(File)
                expect(photoFile.name).toBe('test.png')
                expect(photoFile.type).toBe('image/png')
            })
        }
    )

    // Displays a correctly spelled toast message "Product Updated Successfully"
    // but its a `toast.error` rather than `toast.success`, as the if-else
    // statement for success check is flipped.
    it.failing(
        'displays success message and navigates to products page on successful product creation',
        async () => {
            // Arrange
            let capturedFormData
            axios.post.mockImplementation((url, data) => {
                capturedFormData = data
                return Promise.resolve({
                    data: { success: true, message: 'Product Created Successfully' },
                })
            })
            const component = (
                <MemoryRouter>
                    <Routes>
                        <Route path='/' element={<CreateProduct />} />
                    </Routes>
                </MemoryRouter>
            )
            render(component)
            await waitFor(() => {
                expect(
                    screen.getByRole('combobox', { name: /select a category/i })
                ).toBeInTheDocument()
            })

            // Act
            fireEvent.change(screen.getByPlaceholderText('write a name'), {
                target: { value: 'Test Product' },
            })
            fireEvent.change(screen.getByPlaceholderText('write a description'), {
                target: { value: 'Test Description' },
            })
            fireEvent.change(screen.getByPlaceholderText('write a Price'), {
                target: { value: '100' },
            })
            fireEvent.change(screen.getByPlaceholderText('write a quantity'), {
                target: { value: '10' },
            })
            const categorySelect = screen.getByRole('combobox', { name: /select a category/i })
            fireEvent.change(categorySelect, { target: { value: 'cat1' } })
            const shippingSelect = screen.getByRole('combobox', { name: /select shipping/i })
            fireEvent.change(shippingSelect, { target: { value: '1' } })
            const fileInput = screen
                .getByText('Upload Photo')
                .closest('label')
                .querySelector('input[type="file"]')
            const file = new File(['test'], 'test.png', { type: 'image/png' })
            fireEvent.change(fileInput, { target: { files: [file] } })
            fireEvent.click(screen.getByText('CREATE PRODUCT'))

            // Assert
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Product Created Successfully')
                expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin/products')
            })
        }
    )

    // UI crashes on erroneous inputs:
    // https://github.com/cs4218/cs4218-project-2024-team04/issues/13
    // Edit: Fixed runtime error but UI displays a toast message "something
    // went wrong" which is not the error message returned by the backend.
    it.failing('displays backend error message when submitting an empty form', async () => {
        // Arrange
        const BACKEND_ERROR_MESSAGE = 'ERROR MESSAGE'
        axios.post.mockRejectedValueOnce({
            response: {
                status: 400,
                data: {
                    success: false,
                    message: BACKEND_ERROR_MESSAGE,
                },
            },
        })
        const component = (
            <MemoryRouter>
                <Routes>
                    <Route path='/' element={<CreateProduct />} />
                </Routes>
            </MemoryRouter>
        )
        render(component)
        await waitFor(() => {
            expect(screen.getByRole('combobox', { name: /select a category/i })).toBeInTheDocument()
        })

        // Act
        await waitFor(() => {
            fireEvent.click(screen.getByText('CREATE PRODUCT'))
        })

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(BACKEND_ERROR_MESSAGE)
        })
    })

    // UI crashes on erroneous inputs:
    // https://github.com/cs4218/cs4218-project-2024-team04/issues/13
    // Edit: Fixed runtime error but UI displays a toast message "something
    // went wrong" which is not the error message returned by the backend.
    it.failing(
        'displays backend error message when submitting form with some invalid inputs',
        async () => {
            // Arrange
            const BACKEND_ERROR_MESSAGE = 'ERROR MESSAGE'
            axios.post.mockRejectedValueOnce({
                response: {
                    status: 400,
                    data: {
                        success: false,
                        message: BACKEND_ERROR_MESSAGE,
                    },
                },
            })
            const component = (
                <MemoryRouter>
                    <Routes>
                        <Route path='/' element={<CreateProduct />} />
                    </Routes>
                </MemoryRouter>
            )
            render(component)
            await waitFor(() => {
                expect(
                    screen.getByRole('combobox', { name: /select a category/i })
                ).toBeInTheDocument()
            })

            // Act
            fireEvent.change(screen.getByPlaceholderText('write a name'), {
                target: { value: 'Test Product' },
            })
            fireEvent.change(screen.getByPlaceholderText('write a description'), {
                target: { value: 'Test Description' },
            })
            fireEvent.change(screen.getByPlaceholderText('write a Price'), {
                target: { value: '-1' },
            })
            fireEvent.change(screen.getByPlaceholderText('write a quantity'), {
                target: { value: '0.1' },
            })
            const categorySelect = screen.getByRole('combobox', { name: /select a category/i })
            fireEvent.change(categorySelect, { target: { value: 'cat1' } })
            const shippingSelect = screen.getByRole('combobox', { name: /select shipping/i })
            fireEvent.change(shippingSelect, { target: { value: '1' } })
            const fileInput = screen
                .getByText('Upload Photo')
                .closest('label')
                .querySelector('input[type="file"]')
            const file = new File(['test'], 'test.png', { type: 'image/png' })
            fireEvent.change(fileInput, { target: { files: [file] } })
            fireEvent.click(screen.getByText('CREATE PRODUCT'))

            // Assert
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(BACKEND_ERROR_MESSAGE)
            })
        }
    )

    // UI crashes on erroneous inputs:
    // https://github.com/cs4218/cs4218-project-2024-team04/issues/13
    // Edit: Fixed runtime error but UI displays a toast message "something
    // went wrong" which is not the error message returned by the backend.
    it.failing(
        'displays generic error message when server is down and POST request times out',
        async () => {
            // Arrange
            const timeoutError = new Error('timeout of 5000ms exceeded')
            timeoutError.code = 'ECONNABORTED'
            axios.post.mockRejectedValueOnce(timeoutError)
            const component = (
                <MemoryRouter>
                    <Routes>
                        <Route path='/' element={<CreateProduct />} />
                    </Routes>
                </MemoryRouter>
            )
            render(component)
            await waitFor(() => {
                expect(
                    screen.getByRole('combobox', { name: /select a category/i })
                ).toBeInTheDocument()
            })

            // Act
            await waitFor(() => {
                fireEvent.click(screen.getByText('CREATE PRODUCT'))
            })

            // Assert
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(BACKEND_ERROR_MESSAGE)
            })
        }
    )
})
