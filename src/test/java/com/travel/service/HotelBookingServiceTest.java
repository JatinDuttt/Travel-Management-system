package com.travel.service;

import com.travel.entity.*;
import com.travel.repository.HotelBookingRepository;
import com.travel.repository.HotelRepository;
import com.travel.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HotelBookingServiceTest {
    @Mock UserRepository users;
    @Mock HotelRepository hotels;
    @Mock HotelBookingRepository stays;
    @InjectMocks HotelBookingService service;

    private Hotel hotel(int rooms) {
        Hotel h = new Hotel();
        h.setId(1L);
        h.setPricePerNight(new BigDecimal("100"));
        h.setRooms(rooms);
        return h;
    }

    @Test
    void booking_computesTotal_fromNightsAndRooms() {
        LocalDate in = LocalDate.now().plusDays(10);
        when(users.findByEmail("a@b.com")).thenReturn(Optional.of(new User()));
        when(hotels.findForUpdate(1L)).thenReturn(Optional.of(hotel(5)));
        when(stays.findOverlapping(eq(1L), any(), any(), any())).thenReturn(List.of());
        when(stays.save(any(HotelBooking.class))).thenAnswer(i -> i.getArgument(0));

        HotelBooking b = service.book("a@b.com", 1L, in, in.plusDays(3), 2);

        assertEquals(0, new BigDecimal("600").compareTo(b.getTotalPrice()));
        assertEquals(BookingStatus.CONFIRMED, b.getStatus());
    }

    @Test
    void booking_isRejected_whenAnyNightIsFull() {
        LocalDate in = LocalDate.now().plusDays(10);
        HotelBooking existing = new HotelBooking();
        existing.setCheckIn(in.plusDays(1));
        existing.setCheckOut(in.plusDays(2));
        existing.setRooms(2);
        when(users.findByEmail("a@b.com")).thenReturn(Optional.of(new User()));
        when(hotels.findForUpdate(1L)).thenReturn(Optional.of(hotel(2)));
        when(stays.findOverlapping(eq(1L), any(), any(), any())).thenReturn(List.of(existing));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.book("a@b.com", 1L, in, in.plusDays(3), 1));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(stays, never()).save(any());
    }

    @Test
    void booking_isRejected_whenCheckOutIsNotAfterCheckIn() {
        LocalDate in = LocalDate.now().plusDays(10);
        when(users.findByEmail("a@b.com")).thenReturn(Optional.of(new User()));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.book("a@b.com", 1L, in, in, 1));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }
}
